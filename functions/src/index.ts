import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
import {
  exchangeSlackToken,
  fetchSlackUserInfo,
  transformSlackUserToFirebase,
  generateFirebaseCustomToken,
  saveUserToFirestore,
  verifyUserSaved,
  generateSuccessResponseHTML,
  generateErrorResponseHTML,
  analyzeSlackAuthedUserContext
} from './oauthHelpers';
import { functionsLogger } from './utils/logger';

// Global options for v2 functions
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// 環境変数を読み込み（開発環境用）
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Firebase Admin初期化
admin.initializeApp();
const db = admin.firestore();

// Slack設定（v2では環境変数のみ使用）
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

// 暗号化設定
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32バイトのキー
const ALGORITHM = 'aes-256-gcm';

// OAuth state検証用の設定
const STATE_SECRET = process.env.STATE_SECRET || ENCRYPTION_KEY; // state検証用の秘密鍵
const STATE_EXPIRY_MINUTES = 10; // stateの有効期限（分）

// Slackトークン暗号化・復号化関数
function encryptSlackToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY環境変数が設定されていません');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  // AAD（Additional Authenticated Data）を設定してコンテキストを認証
  const aad = Buffer.from('slack-token');
  cipher.setAAD(aad);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // AAD + IV + authTag + encryptedDataを結合して返す
  return aad.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decryptSlackToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY環境変数が設定されていません');
  }

  const parts = encryptedToken.split(':');
  if (parts.length !== 4) {
    throw new Error('不正な暗号化データ形式');
  }

  const aad = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];

  // AADの検証
  if (aad.toString() !== 'slack-token') {
    throw new Error('不正なAAD: データの整合性が確認できません');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// OAuth state検証関数
function generateOAuthState(): string {
  if (!STATE_SECRET) {
    throw new Error('STATE_SECRET環境変数が設定されていません');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const randomValue = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({ timestamp, randomValue });

  // HMAC-SHA256でデジタル署名を作成
  const hmac = crypto.createHmac('sha256', STATE_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');

  // Base64エンコードして返す
  return Buffer.from(`${payload}.${signature}`).toString('base64');
}

function validateOAuthState(state: string): boolean {
  if (!STATE_SECRET) {
    throw new Error('STATE_SECRET環境変数が設定されていません');
  }

  try {
    // Base64デコード
    const decoded = Buffer.from(state, 'base64').toString();
    const [payload, expectedSignature] = decoded.split('.');

    if (!payload || !expectedSignature) {
      return false;
    }

    // 署名検証
    const hmac = crypto.createHmac('sha256', STATE_SECRET);
    hmac.update(payload);
    const actualSignature = hmac.digest('hex');

    if (actualSignature !== expectedSignature) {
      return false;
    }

    // タイムスタンプ検証
    const data = JSON.parse(payload);
    const currentTime = Math.floor(Date.now() / 1000);
    const stateAge = currentTime - data.timestamp;
    const maxAge = STATE_EXPIRY_MINUTES * 60; // 秒に変換

    return stateAge <= maxAge;
  } catch (error) {
    return false;
  }
}

// 定数
const JST_OFFSET = 9 * 60 * 60 * 1000; // 日本時間オフセット（9時間）
const ACTION_MAP = {
  "enter": "入室",
  "exit": "退室",
  "takekey": "鍵取得",
  "returnkey": "鍵返却"
} as const;

/**
 * 日本時間でフォーマットされた時刻文字列を返す
 */
function formatTimestamp(timestamp?: FirebaseFirestore.Timestamp | Date): string {
  let date: Date;

  if (timestamp && typeof (timestamp as any).toDate === "function") {
    date = (timestamp as FirebaseFirestore.Timestamp).toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date();
  }

  const jstDate = new Date(date.getTime() + JST_OFFSET);

  return [
    jstDate.getUTCFullYear(),
    String(jstDate.getUTCMonth() + 1).padStart(2, '0'),
    String(jstDate.getUTCDate()).padStart(2, '0')
  ].join('/') + ' ' + [
    String(jstDate.getUTCHours()).padStart(2, '0'),
    String(jstDate.getUTCMinutes()).padStart(2, '0')
  ].join(':');
}

/**
 * ユーザートークンを使ってSlackメッセージを送信（Block Kit対応）
 */
async function sendSlackMessageAsUser(
  userToken: string,
  channelId: string,
  text: string,
  blocks?: Record<string, any>[],
  retryCount = 3
): Promise<void> {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const payload: any = {
        channel: channelId,
        text: text
      };

      // Block Kitブロックがある場合は追加
      if (blocks && blocks.length > 0) {
        payload.blocks = blocks;
      }

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log(`DEBUG: Slack API response:`, JSON.stringify(responseData, null, 2));
      console.log(`DEBUG: Response status: ${response.status}`);

      if (responseData.ok) {
        console.log(`DEBUG: User message posted successfully!`);
        return;
      }

      // エラーハンドリング
      console.error(`ERROR: Slack API error: ${responseData.error}`);
      if (responseData.error === 'not_in_channel') {
        // ユーザーがチャンネルに参加していない場合はBot投稿にフォールバック
        throw new Error('USER_NOT_IN_CHANNEL');
      }

      if (responseData.error === 'invalid_auth' || responseData.error === 'token_revoked') {
        throw new Error('INVALID_USER_TOKEN');
      }

      // Rate Limit処理
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * attempt;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw new Error(`Slack API error: ${responseData.error || response.statusText}`);
    } catch (error) {
      console.error(`Failed to send Slack message as user (attempt ${attempt}/${retryCount}):`, error);

      if (attempt < retryCount && error.message !== 'USER_NOT_IN_CHANNEL' && error.message !== 'INVALID_USER_TOKEN') {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Botトークンを使ってSlackメッセージを送信（フォールバック用）
 */
async function sendSlackMessageAsBot(blocks: Record<string, any>[], retryCount = 3): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    throw new Error("Slack webhook URL not configured");
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks,
          username: "研究室入退室管理システム",
          icon_emoji: ":office:",
        }),
      });

      if (response.ok) return;

      // Rate Limit処理
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * attempt;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw new Error(`Slack API error: ${response.status} - ${response.statusText}`);
    } catch (error) {
      console.error(`Failed to send Slack message as bot (attempt ${attempt}/${retryCount}):`, error);

      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        console.error("All retry attempts failed for Slack notification");
        throw error;
      }
    }
  }
}

/**
 * 入退室・鍵管理ログのSlack Block Kitブロックを作成（Section Block使用）
 */
function createLogBlocks(userName: string, action: string, room: string, timestamp: string, userAvatar?: string): Record<string, any>[] {
  const normalizedAction = action.normalize('NFC').trim();

  // 鍵管理は専用フォーマット、入退室は従来フォーマット
  if (normalizedAction.includes("鍵")) {
    // 鍵管理専用デザイン
    const keyAction = normalizedAction.includes("鍵取得") ? "🔑 鍵取得" : "🔑 鍵返却";

    const block: any = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${keyAction} | *${userName}* | ${room}`
      }
    };

    // ユーザーアバターがある場合はaccessoryとして追加
    if (userAvatar) {
      block.accessory = {
        type: "image",
        image_url: userAvatar,
        alt_text: userName
      };
    }

    return [block];
  } else {
    // 通常の入退室デザイン（絵文字あり）
    const isEntry = normalizedAction.includes("入室");
    const statusText = isEntry ? "🟢 入室" : "🔴 退室";

    const block: any = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${statusText} | *${userName}* | ${room}`
      }
    };

    // ユーザーアバターがある場合はaccessoryとして追加
    if (userAvatar) {
      block.accessory = {
        type: "image",
        image_url: userAvatar,
        alt_text: userName
      };
    }

    return [block];
  }
}

/**
 * ユーザートークン投稿用のSection Blockを作成（太字フォーマット）
 */
function createUserMessageBlocks(userName: string, action: string, room: string, timestamp: string): Record<string, any>[] {
  const normalizedAction = action.normalize('NFC').trim();

  if (normalizedAction.includes("鍵")) {
    const keyAction = normalizedAction.includes("鍵取得") ? "🔑 鍵取得" : "🔑 鍵返却";
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${keyAction} | *${userName}* | ${room}`
        }
      }
    ];
  } else {
    const isEntry = normalizedAction.includes("入室");
    const statusText = isEntry ? "🟢 入室" : "🔴 退室";
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${statusText} | *${userName}* | ${room}`
        }
      }
    ];
  }
}

/**
 * Firestoreログ作成時のSlack通知（v2）
 */
export const onLogCreate = onDocumentCreated("logs/{logId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    try {
      console.log('DEBUG v2: onLogCreate function started - timestamp: ' + new Date().toISOString());
      const logData = snapshot.data();
      console.log('DEBUG v2: logData=', JSON.stringify(logData, null, 2));
      if (!logData) return;

      const { userName, action, room, timestamp, userId } = logData;
      console.log('DEBUG: Extracted data - userName=', userName, 'userId=', userId);

      // ユーザー情報を取得
      let userData: any = null;
      let userAvatar: string | undefined;
      let userToken: string | undefined;

      if (userId) {
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          userData = userDoc.data();
          userAvatar = userData?.avatar;
          userToken = userData?.slackUserToken ? decryptSlackToken(userData.slackUserToken) : undefined;

          // デバッグログ追加
          console.log(`DEBUG: userId=${userId}`);
          console.log(`DEBUG: userData exists=${!!userData}`);
          console.log(`DEBUG: userToken exists=${!!userToken}`);
          console.log(`DEBUG: userToken length=${userToken ? userToken.length : 0}`);
          if (userToken) {
            console.log(`DEBUG: userToken prefix=${userToken.substring(0, 10)}...`);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }

      const formattedTime = formatTimestamp(timestamp);

      if (!SLACK_CHANNEL_ID) {
        console.error('SLACK_CHANNEL_ID not configured');
        return;
      }

      // シンプルなテキストメッセージを作成（ユーザー本人として投稿）
      const normalizedAction = action.normalize('NFC').trim();
      let messageText = '';

      if (normalizedAction.includes("鍵")) {
        const keyAction = normalizedAction.includes("鍵取得") ? "🔑 鍵取得" : "🔑 鍵返却";
        messageText = `${keyAction} | ${userName} | ${room}`;
      } else {
        const isEntry = normalizedAction.includes("入室");
        const statusText = isEntry ? "🟢 入室" : "🔴 退室";
        messageText = `${statusText} | ${userName} | ${room}`;
      }

      // ユーザートークンがある場合は本人として投稿を試行（Section Block使用）
      if (userToken) {
        try {
          console.log(`DEBUG: Attempting user post with token: ${userToken.substring(0, 15)}...`);
          const userBlocks = createUserMessageBlocks(userName, action, room, formattedTime);
          console.log(`DEBUG: User blocks created:`, JSON.stringify(userBlocks, null, 2));
          await sendSlackMessageAsUser(userToken, SLACK_CHANNEL_ID, messageText, userBlocks);
          console.log(`SUCCESS: Slack message sent as user: ${userName} ${action} at ${room}`);
          return;
        } catch (error) {
          console.error(`ERROR: Failed to send as user, falling back to bot:`, error);
          console.error(`ERROR: User token was: ${userToken ? userToken.substring(0, 15) + '...' : 'undefined'}`);

          // ユーザートークンエラーの場合は、Firestoreからトークンを削除
          if (error.message === 'INVALID_USER_TOKEN') {
            try {
              await db.collection('users').doc(userId).update({
                slackUserToken: admin.firestore.FieldValue.delete()
              });
              console.log('Removed invalid user token from Firestore');
            } catch (updateError) {
              console.error('Failed to remove invalid token:', updateError);
            }
          }
        }
      }

      // フォールバック: Bot投稿
      const blocks = createLogBlocks(userName, action, room, formattedTime, userAvatar);
      await sendSlackMessageAsBot(blocks);
      console.log(`Slack notification sent as bot: ${userName} ${action} at ${room}`);
    } catch (error) {
      console.error("Error in onLogCreate:", error);
    }
  });

/**
 * 鍵状態変更の監視（通知はonLogCreateに統一）
 */
export const onUserKeyStatusChange = onDocumentUpdated("users/{userId}", async (event) => {
    const change = event.data;
    if (!change) return;
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      // hasKeyの変更がない場合は何もしない
      if (beforeData.hasKey === afterData.hasKey) return;

      // ログ記録と通知はクライアント側（useAttendance.ts）とonLogCreateで行われる
      // ここでは状態変更のログ出力のみ
      const action = afterData.hasKey ? "鍵取得" : "鍵返却";
      console.log(`Key status changed for user ${afterData.name}: ${action}`);
    } catch (error) {
      console.error("Error in onUserKeyStatusChange:", error);
    }
  });

/**
 * Slack OAuth認証コールバック処理
 */
export const slackOAuthCallback = onRequest(async (req, res) => {
  try {
    // GETリクエストのみ処理
    if (req.method !== 'GET') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { code, state } = req.query;

    if (!code) {
      console.error('Missing authorization code in request:', req.query);
      res.status(400).send(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>Missing authorization code. Please try logging in again.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'SLACK_AUTH_ERROR',
                  error: 'Missing authorization code'
                }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    // CSRF保護: stateパラメータの存在確認
    if (!state || typeof state !== 'string') {
      console.error('Missing or invalid state parameter:', state);
      res.status(400).send(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>Invalid request. Please try logging in again.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'SLACK_AUTH_ERROR',
                  error: 'Invalid state parameter'
                }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    // stateパラメータの暗号学的検証
    if (!validateOAuthState(state)) {
      functionsLogger.error('OAuth state validation failed - potential CSRF attack');
      res.status(400).send(generateErrorResponseHTML('Invalid or expired authentication request'));
      return;
    }

    // Slack OAuth token exchange
    console.log('=== OAUTH DEBUG START ===');
    console.log('Starting Slack OAuth token exchange with code:', code);
    console.log('Client ID available:', !!SLACK_CLIENT_ID);
    console.log('Client Secret available:', !!SLACK_CLIENT_SECRET);
    console.log('SLACK_CLIENT_ID:', SLACK_CLIENT_ID);
    console.log('SLACK_CLIENT_SECRET length:', SLACK_CLIENT_SECRET ? SLACK_CLIENT_SECRET.length : 0);

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID || '',
        client_secret: SLACK_CLIENT_SECRET || '',
        code: code as string,
        redirect_uri: 'https://slackoauthcallback-ili5e72mnq-uc.a.run.app',
      }),
    });

    console.log('Token exchange response status:', tokenResponse.status);
    const tokenData = await tokenResponse.json();
    console.log('Token data:', JSON.stringify(tokenData, null, 2));

    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData.error);

      // 特定のエラーに対する適切なメッセージ
      if (tokenData.error === 'invalid_team_for_non_distributed_app') {
        throw new Error('このSlackワークスペースはアプリの利用が許可されていません。管理者にお問い合わせください。');
      }

      throw new Error(tokenData.error || 'Slack OAuth failed');
    }

    // ユーザー情報を取得（OAuth tokenから認証されたユーザー）
    console.log('Access token available:', !!tokenData.access_token);
    console.log('User access token available:', !!tokenData.authed_user?.access_token);
    console.log('Authed user ID:', tokenData.authed_user?.id);
    console.log('Attempting to fetch user info from Slack API...');

    const authedUserAnalysis = analyzeSlackAuthedUserContext(tokenData);
    const userId = tokenData.authed_user?.id;
    const userAccessToken = tokenData.authed_user?.access_token;

    // デバッグログ追加
    console.log('DEBUG OAuth: userId=', userId);
    console.log('DEBUG OAuth: userAccessToken exists=', !!userAccessToken);
    console.log('DEBUG OAuth: authed_user=', JSON.stringify(tokenData.authed_user, null, 2));

    if (!userId) {
      const reason = authedUserAnalysis.missingIdReason || 'Slack OAuth response did not include authed_user.id';
      functionsLogger.error(reason);
      throw new Error(reason);
    }

    if (!userAccessToken) {
      const reason = authedUserAnalysis.missingAccessTokenReason || 'Slack OAuth response did not include authed_user.access_token';
      functionsLogger.error(reason);
      throw new Error(reason);
    }

    const userResponse = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('User info response status:', userResponse.status);
    const userData = await userResponse.json();
    console.log('User data response:', JSON.stringify(userData, null, 2));

    if (!userData.ok || !userData.user) {
      console.error('Slack users.info API error:', userData.error);
      throw new Error(`Failed to get user info from Slack: ${userData.error || 'Unknown error'}`);
    }

    const user = userData.user;
    const profile = user.profile || {};

    // Firebase Auth カスタムトークンを作成
    const firebaseUser = {
      uid: `slack_${user.id}`,
      name: profile.display_name || profile.real_name || user.name || 'Unknown User',
      email: profile.email || user.email || '',
      avatar: profile.image_192 || profile.image_72,
      provider: 'slack',
      slackUserId: user.id,
      slackTeamId: tokenData.team.id
    };

    // Firestoreにユーザー情報を保存（ユーザートークンも暗号化して保存）
    console.log('DEBUG: Saving user to Firestore with userAccessToken=', !!userAccessToken);
    console.log('DEBUG: userAccessToken length=', userAccessToken ? userAccessToken.length : 0);

    const { isNewUser } = await saveUserToFirestore(firebaseUser, userAccessToken, encryptSlackToken);

    console.log('DEBUG: User saved to Firestore successfully. isNewUser=', isNewUser);

    // 保存確認のため再読み込み
    const savedUser = await db.collection('users').doc(firebaseUser.uid).get();
    const savedData = savedUser.data();
    console.log('DEBUG: Saved user slackUserToken exists=', !!savedData?.slackUserToken);
    console.log('DEBUG: Saved user slackUserToken length=', savedData?.slackUserToken ? savedData.slackUserToken.length : 0);

    // 認証成功をクライアントに通知（ポップアップ用JavaScript）
    res.send(`
      <html>
        <head>
          <title>Slack Authentication Success</title>
        </head>
        <body>
          <h1>認証成功</h1>
          <p>Slackログインが完了しました。このウィンドウは自動的に閉じられます。</p>
          <script>
            const userData = ${JSON.stringify(firebaseUser)};
            console.log('Authentication successful, sending message to parent window:', userData);

            // ポップアップの親ウィンドウに結果を送信
            const origins = [
              'https://mizuno-lab-access-control.web.app',
              'http://localhost:5173',
              'http://localhost:5174'
            ];

            origins.forEach(origin => {
              try {
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'SLACK_AUTH_SUCCESS',
                    user: userData,
                    state: '${state}'
                  }, origin);
                  console.log('Message sent to origin:', origin);
                }
              } catch (e) {
                console.log('Failed to send message to', origin, e);
              }
            });

            // 2秒後にウィンドウを閉じる
            setTimeout(() => {
              console.log('Closing authentication window');
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Slack OAuth error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);

    // invalid_team_for_non_distributed_app エラーの場合は特別なログ
    if (error.message && error.message.includes('invalid_team_for_non_distributed_app')) {
      console.error('Team access error: User attempted to access from unauthorized workspace');
    }
    res.status(500).send(`
      <html>
        <body>
          <script>
            console.log('Sending auth error message:', '${String(error)}');

            if (window.opener) {
              const origins = [
                'https://mizuno-lab-access-control.web.app',
                'http://localhost:5173',
                'http://localhost:5174'
              ];

              origins.forEach(origin => {
                try {
                  window.opener.postMessage({
                    type: 'SLACK_AUTH_ERROR',
                    error: '${String(error)}'
                  }, origin);
                } catch (e) {
                  console.log('Failed to send error message to', origin, e);
                }
              });
              window.close();
            } else {
              window.location.href = 'https://mizuno-lab-access-control.web.app/?auth=error&message=' + encodeURIComponent('${String(error)}');
            }
          </script>
        </body>
      </html>
    `);
  }
});

/**
 * テスト用メッセージ送信（デバッグ版）
 */
export const sendTestMessage = onRequest(async (req, res) => {
  try {
    const testUser = req.body?.userName || "TestUser";
    const testAction = req.body?.action || "enter";
    const testRoom = req.body?.room || "Room2218";

    // 日本語の文字化けを防ぐため、英語パラメータを日本語に明示的に変換
    const jpAction = ACTION_MAP[testAction as keyof typeof ACTION_MAP] || testAction;

    // 部屋名も英語パラメータの場合は日本語に変換
    const jpRoom = testRoom === "Room2218" ? "A2218室" : testRoom;

    // テスト用のアバター（オプション）
    const testAvatar = req.body?.avatar;
    const testUserToken = req.body?.userToken; // テスト用ユーザートークン

    console.log('DEBUG sendTestMessage: testUserToken exists=', !!testUserToken);
    console.log('DEBUG sendTestMessage: SLACK_CHANNEL_ID=', SLACK_CHANNEL_ID);

    // ユーザートークンがある場合はユーザー投稿をテスト
    if (testUserToken && SLACK_CHANNEL_ID) {
      console.log('DEBUG sendTestMessage: Attempting user token posting');
      try {
        // ユーザートークン投稿用のメッセージとブロック作成
        const messageText = jpAction.includes("鍵")
          ? `🔑 ${jpAction} | ${testUser} | ${jpRoom}`
          : `${jpAction === "入室" ? "🟢 入室" : "🔴 退室"} | ${testUser} | ${jpRoom}`;

        console.log('DEBUG sendTestMessage: messageText=', messageText);
        const userBlocks = createUserMessageBlocks(testUser, jpAction, jpRoom, formatTimestamp());
        console.log('DEBUG sendTestMessage: userBlocks=', JSON.stringify(userBlocks, null, 2));

        await sendSlackMessageAsUser(testUserToken, SLACK_CHANNEL_ID, messageText, userBlocks);
        console.log('DEBUG sendTestMessage: User token posting successful');

        res.json({
          success: true,
          message: "Test notification sent as user successfully",
          params: { user: testUser, action: jpAction, room: jpRoom, method: "user_token" }
        });
        return;
      } catch (error) {
        console.error("User token test failed:", error);
        console.error("Error details:", error.message);
        // フォールバックしてBot投稿を続行
      }
    }

    // Bot投稿（フォールバック）
    const blocks = createLogBlocks(testUser, jpAction, jpRoom, formatTimestamp(), testAvatar);
    await sendSlackMessageAsBot(blocks);
    res.json({
      success: true,
      message: "Test notification sent as bot successfully",
      params: { user: testUser, action: jpAction, room: jpRoom, method: "bot" }
    });
  } catch (error) {
    console.error("Test message error:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * デバッグ用：環境変数とパラメータ確認
 */
export const debugTest = onRequest(async (req, res) => {
  try {
    const { userToken, channelId } = req.body;

    console.log('=== DEBUG TEST START ===');
    console.log('SLACK_CHANNEL_ID from env:', SLACK_CHANNEL_ID);
    console.log('userToken from request:', userToken ? `${userToken.substring(0, 10)}...` : 'undefined');
    console.log('channelId from request:', channelId);
    console.log('Request body:', JSON.stringify(req.body));

    if (userToken && (channelId || SLACK_CHANNEL_ID)) {
      const targetChannel = channelId || SLACK_CHANNEL_ID;
      console.log('Attempting Slack API call to channel:', targetChannel);

      try {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: targetChannel,
            text: 'Debug test from Firebase Functions',
            blocks: [{
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '🔧 **Debug test** from Firebase Functions'
              }
            }]
          })
        });

        const result = await response.json();
        console.log('Slack API response:', JSON.stringify(result));

        res.json({
          success: true,
          slackResponse: result,
          environment: {
            SLACK_CHANNEL_ID,
            requestData: req.body
          }
        });
      } catch (error) {
        console.error('Slack API error:', error);
        res.json({
          success: false,
          error: error.message,
          environment: { SLACK_CHANNEL_ID }
        });
      }
    } else {
      res.json({
        success: false,
        message: 'Missing userToken or channelId',
        environment: { SLACK_CHANNEL_ID },
        received: req.body
      });
    }
  } catch (error) {
    console.error('Debug test error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * OAuth state生成エンドポイント
 */
export const generateState = onRequest(async (req, res) => {
  try {
    // CORS ヘッダーを設定
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const state = generateOAuthState();

    res.json({
      success: true,
      state: state,
      expiresIn: STATE_EXPIRY_MINUTES * 60 // 秒単位
    });

  } catch (error) {
    functionsLogger.error('Error generating OAuth state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate OAuth state'
    });
  }
});

/**
 * データリセット（開発環境のみ）
 */
export const resetData = onRequest(async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Not allowed in production" });
      return;
    }

    // データ削除
    const [usersSnapshot, logsSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("logs").get()
    ]);

    const deletePromises = [
      ...usersSnapshot.docs.map(doc => doc.ref.delete()),
      ...logsSnapshot.docs.map(doc => doc.ref.delete())
    ];

    await Promise.all(deletePromises);

    // Slack通知
    const resetBlocks = createLogBlocks("System", "データリセット", "管理", formatTimestamp());
    await sendSlackMessageAsBot(resetBlocks);

    res.json({ success: true, message: "Data reset completed" });
  } catch (error) {
    console.error("Reset data error:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});