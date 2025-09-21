/**
 * Slack OAuth関連のヘルパー関数群
 */
import * as admin from 'firebase-admin';
import { functionsLogger } from './utils/logger';

// 型定義
export interface SlackTokenData {
  ok: boolean;
  app_id: string;
  authed_user: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
  scope: string;
  token_type: string;
  access_token: string;
  bot_user_id: string;
  team: {
    id: string;
    name: string;
  };
  enterprise?: any;
  is_enterprise_install: boolean;
}

export interface SlackUserData {
  ok: boolean;
  user: {
    id: string;
    name: string;
    real_name: string;
    profile: {
      real_name: string;
      display_name: string;
      email: string;
      image_192: string;
      image_72: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    is_admin: boolean;
    is_owner: boolean;
  };
}

export interface FirebaseUserData {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  provider: string;
  slackUserId: string;
  slackTeamId: string;
}

/**
 * Slackトークンの交換
 */
export async function exchangeSlackToken(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<SlackTokenData> {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Slackユーザー情報の取得
 */
export async function fetchSlackUserInfo(
  userId: string,
  userAccessToken: string
): Promise<SlackUserData> {
  const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
    headers: {
      'Authorization': `Bearer ${userAccessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`User info fetch failed: ${response.status}`);
  }

  return response.json();
}

/**
 * SlackユーザーデータをFirebaseユーザーデータに変換
 */
export function transformSlackUserToFirebase(
  slackUser: SlackUserData['user'],
  teamId: string
): FirebaseUserData {
  return {
    uid: `slack_${slackUser.id}`,
    name: slackUser.profile.display_name || slackUser.profile.real_name || slackUser.name || 'Unknown User',
    email: slackUser.profile.email || '',
    avatar: slackUser.profile.image_192 || slackUser.profile.image_72 || '',
    provider: 'slack',
    slackUserId: slackUser.id,
    slackTeamId: teamId,
  };
}

/**
 * Firebase Custom Tokenの生成
 */
export async function generateFirebaseCustomToken(
  firebaseUser: FirebaseUserData
): Promise<string | null> {
  try {
    functionsLogger.debug('Generating Firebase custom token for UID:', firebaseUser.uid);

    const customToken = await admin.auth().createCustomToken(firebaseUser.uid, {
      provider: 'slack',
      slackUserId: firebaseUser.slackUserId,
      slackTeamId: firebaseUser.slackTeamId,
      name: firebaseUser.name,
      email: firebaseUser.email
    });

    functionsLogger.debug('Custom token generated successfully');
    return customToken;
  } catch (error) {
    functionsLogger.warn('Custom token generation failed, continuing without it:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Firestoreにユーザー情報を保存
 */
export async function saveUserToFirestore(
  firebaseUser: FirebaseUserData,
  userAccessToken: string,
  encryptSlackToken: (token: string) => string
): Promise<void> {
  const db = admin.firestore();

  functionsLogger.debug('Saving user to Firestore with userAccessToken=', !!userAccessToken);

  await db.collection('users').doc(firebaseUser.uid).set({
    ...firebaseUser,
    lastActivity: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    room2218: false,
    gradRoom: false,
    hasKey: false,
    // ユーザートークンを暗号化して保存
    slackUserToken: encryptSlackToken(userAccessToken)
  }, { merge: true });

  functionsLogger.debug('User saved to Firestore successfully');
}

/**
 * 保存確認のためのユーザー再読み込み
 */
export async function verifyUserSaved(uid: string): Promise<void> {
  const db = admin.firestore();
  const savedUser = await db.collection('users').doc(uid).get();
  const savedData = savedUser.data();

  functionsLogger.debug('Saved user slackUserToken exists=', !!savedData?.slackUserToken);
}

/**
 * OAuth成功レスポンスHTMLの生成
 */
export function generateSuccessResponseHTML(
  firebaseUser: FirebaseUserData,
  customToken: string | null,
  state: string
): string {
  return `
    <html>
      <head>
        <title>Slack Authentication Success</title>
      </head>
      <body>
        <h1>認証成功</h1>
        <p>Slackログインが完了しました。このウィンドウは自動的に閉じられます。</p>
        <script>
          const userData = ${JSON.stringify(firebaseUser)};
          const customToken = ${customToken ? `'${customToken}'` : 'null'};
          console.log('Authentication successful, sending message to parent window:', userData);
          console.log('Custom token available:', !!customToken);

          // ポップアップの親ウィンドウに結果を送信
          const origins = [
            'https://mizuno-lab-access-control.web.app',
            'http://localhost:3001',
            'http://localhost:5173',
            'http://localhost:5174'
          ];

          origins.forEach(origin => {
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'SLACK_AUTH_SUCCESS',
                  user: userData,
                  customToken: customToken,
                  state: '${state}'
                }, origin);
                console.log('Message sent to origin:', origin);
              }
            } catch (e) {
              console.warn('Failed to send message to origin:', origin, e);
            }
          });

          // 少し待ってからウィンドウを閉じる
          setTimeout(() => {
            try {
              window.close();
            } catch (e) {
              console.warn('Could not close window automatically');
            }
          }, 1000);
        </script>
      </body>
    </html>
  `;
}

/**
 * OAuth失敗レスポンスHTMLの生成
 */
export function generateErrorResponseHTML(error: string): string {
  return `
    <html>
      <head>
        <title>Slack Authentication Error</title>
      </head>
      <body>
        <h1>認証エラー</h1>
        <p>Slack認証に失敗しました: ${error}</p>
        <script>
          const origins = [
            'https://mizuno-lab-access-control.web.app',
            'http://localhost:3001',
            'http://localhost:5173',
            'http://localhost:5174'
          ];

          origins.forEach(origin => {
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'SLACK_AUTH_ERROR',
                  error: '${error}'
                }, origin);
              }
            } catch (e) {
              console.warn('Failed to send error message to origin:', origin, e);
            }
          });

          setTimeout(() => {
            try {
              window.close();
            } catch (e) {
              console.warn('Could not close window automatically');
            }
          }, 3000);
        </script>
      </body>
    </html>
  `;
}