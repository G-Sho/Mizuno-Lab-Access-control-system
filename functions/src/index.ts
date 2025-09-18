import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

// Firebase Admin初期化
admin.initializeApp();
const db = admin.firestore();

// Slack Webhook URL設定
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

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
 * Slackに通知を送信する（リトライ機能付き）
 */
async function sendSlackMessage(blocks: Record<string, any>[], retryCount = 3): Promise<void> {
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
      console.error(`Failed to send Slack message (attempt ${attempt}/${retryCount}):`, error);

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
 * 入退室・鍵管理ログのSlack Block Kitブロックを作成
 */
function createLogBlocks(userName: string, action: string, room: string, timestamp: string, userAvatar?: string): Record<string, any>[] {
  const normalizedAction = action.normalize('NFC').trim();

  // 鍵管理は専用フォーマット、入退室は従来フォーマット
  if (normalizedAction.includes("鍵")) {
    // 鍵管理専用デザイン
    const keyAction = normalizedAction.includes("鍵取得") ? "鍵取得" : "鍵返却";

    return [
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${keyAction} | *${userName}* | A2218室`
          },
          ...(userAvatar ? [{
            type: "image",
            image_url: userAvatar,
            alt_text: userName
          }] : [])
        ]
      }
    ];
  } else {
    // 通常の入退室デザイン（絵文字あり）
    const isEntry = normalizedAction.includes("入室");
    const statusText = isEntry ? "🟢 入室" : "🔴 退室";

    return [
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${statusText} | *${userName}* | ${room}`
          },
          ...(userAvatar ? [{
            type: "image",
            image_url: userAvatar,
            alt_text: userName
          }] : [])
        ]
      }
    ];
  }
}

/**
 * Firestoreログ作成時のSlack通知
 */
export const onLogCreate = functions.firestore
  .document("logs/{logId}")
  .onCreate(async (snapshot, _context) => {
    try {
      const logData = snapshot.data();
      if (!logData) return;

      const { userName, action, room, timestamp, userId } = logData;

      // ユーザー情報を取得してアバターURLを入手
      let userAvatar: string | undefined;
      if (userId) {
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          const userData = userDoc.data();
          userAvatar = userData?.avatar;
        } catch (error) {
          console.error('Error fetching user avatar:', error);
        }
      }

      const formattedTime = formatTimestamp(timestamp);
      const blocks = createLogBlocks(userName, action, room, formattedTime, userAvatar);

      await sendSlackMessage(blocks);
      console.log(`Slack notification sent: ${userName} ${action} at ${room}`);
    } catch (error) {
      console.error("Error in onLogCreate:", error);
    }
  });

/**
 * 鍵状態変更の監視（重複通知防止）
 */
export const onUserKeyStatusChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      if (beforeData.hasKey === afterData.hasKey) return;

      const userName = afterData.name;
      const action = afterData.hasKey ? "鍵取得" : "鍵返却";
      const userAvatar = afterData.avatar;

      // 重複通知防止：5秒以内の同一ログをチェック
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const recentLogs = await db.collection("logs")
        .where("userId", "==", context.params.userId)
        .where("action", "==", action)
        .where("timestamp", ">", fiveSecondsAgo)
        .limit(1)
        .get();

      if (recentLogs.empty) {
        const blocks = createLogBlocks(userName, action, "A2218室", formatTimestamp(), userAvatar);
        await sendSlackMessage(blocks);
        console.log(`Direct key status notification: ${userName} ${action}`);
      }
    } catch (error) {
      console.error("Error in onUserKeyStatusChange:", error);
    }
  });

/**
 * Slack OAuth認証コールバック処理
 */
export const slackOAuthCallback = functions.https.onRequest(async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      throw new Error('Authorization code is required');
    }

    // Slack OAuth token exchange
    console.log('Starting Slack OAuth token exchange with code:', code);
    console.log('Client ID available:', !!process.env.SLACK_CLIENT_ID);
    console.log('Client Secret available:', !!process.env.SLACK_CLIENT_SECRET);

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '',
        client_secret: process.env.SLACK_CLIENT_SECRET || '',
        code: code as string,
        redirect_uri: 'https://us-central1-mizuno-lab-access-control.cloudfunctions.net/slackOAuthCallback',
      }),
    });

    console.log('Token exchange response status:', tokenResponse.status);
    const tokenData = await tokenResponse.json();
    console.log('Token data:', JSON.stringify(tokenData, null, 2));

    if (!tokenData.ok) {
      throw new Error(tokenData.error || 'Slack OAuth failed');
    }

    // ユーザー情報を取得（OAuth tokenから認証されたユーザー）
    console.log('Access token available:', !!tokenData.access_token);
    console.log('Authed user ID:', tokenData.authed_user?.id);
    console.log('Attempting to fetch user info from Slack API...');

    const userId = tokenData.authed_user?.id;
    if (!userId) {
      throw new Error('No user ID found in OAuth response');
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

    // Firestoreにユーザー情報を保存
    await db.collection('users').doc(firebaseUser.uid).set({
      ...firebaseUser,
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      room2218: false,
      gradRoom: false,
      hasKey: false
    }, { merge: true });

    // 認証成功をクライアントに通知（ポップアップ用JavaScript）
    res.send(`
      <html>
        <body>
          <script>
            const userData = ${JSON.stringify(firebaseUser)};
            console.log('Sending auth success message:', userData);

            if (window.opener) {
              // 複数のオリジンに送信（開発環境と本番環境の両方に対応）
              const origins = [
                'https://mizuno-lab-access-control.web.app',
                'http://localhost:5173',
                'http://localhost:5174'
              ];

              origins.forEach(origin => {
                try {
                  window.opener.postMessage({
                    type: 'SLACK_AUTH_SUCCESS',
                    user: userData
                  }, origin);
                } catch (e) {
                  console.log('Failed to send message to', origin, e);
                }
              });

              // 少し待ってからウィンドウを閉じる
              setTimeout(() => window.close(), 500);
            } else {
              // リダイレクト用（ポップアップが使えない場合）
              window.location.href = '/?auth=success&user=' + encodeURIComponent(JSON.stringify(userData));
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Slack OAuth error:', error);
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
              window.location.href = '/?auth=error&message=' + encodeURIComponent('${String(error)}');
            }
          </script>
        </body>
      </html>
    `);
  }
});

/**
 * テスト用メッセージ送信
 */
export const sendTestMessage = functions.https.onRequest(async (req, res) => {
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
    const blocks = createLogBlocks(testUser, jpAction, jpRoom, formatTimestamp(), testAvatar);

    await sendSlackMessage(blocks);
    res.json({
      success: true,
      message: "Test notification sent successfully",
      params: { user: testUser, action: jpAction, room: jpRoom }
    });
  } catch (error) {
    console.error("Test message error:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * データリセット（開発環境のみ）
 */
export const resetData = functions.https.onRequest(async (req, res) => {
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
    await sendSlackMessage(resetBlocks);

    res.json({ success: true, message: "Data reset completed" });
  } catch (error) {
    console.error("Reset data error:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});