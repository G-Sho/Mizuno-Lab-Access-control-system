import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Firebase Admin初期化
admin.initializeApp();
const db = admin.firestore();

// Slack Webhook URL設定
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || functions.config().slack?.webhook_url;

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
function createLogBlocks(userName: string, action: string, room: string, timestamp: string): Record<string, any>[] {
  const normalizedAction = action.normalize('NFC').trim();

  // 鍵管理は専用フォーマット、入退室は従来フォーマット
  if (normalizedAction.includes("鍵")) {
    // 鍵管理専用デザイン（絵文字なし）
    const keyAction = normalizedAction.includes("鍵取得") ? "鍵取得" : "鍵返却";

    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${keyAction} | *${userName}* | A2218室`
        }
      }
    ];
  } else {
    // 通常の入退室デザイン（絵文字あり）
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
 * Firestoreログ作成時のSlack通知
 */
export const onLogCreate = functions.firestore
  .document("logs/{logId}")
  .onCreate(async (snapshot, _context) => {
    try {
      const logData = snapshot.data();
      if (!logData) return;

      const { userName, action, room, timestamp } = logData;
      const formattedTime = formatTimestamp(timestamp);
      const blocks = createLogBlocks(userName, action, room, formattedTime);

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

      // 重複通知防止：5秒以内の同一ログをチェック
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const recentLogs = await db.collection("logs")
        .where("userId", "==", context.params.userId)
        .where("action", "==", action)
        .where("timestamp", ">", fiveSecondsAgo)
        .limit(1)
        .get();

      if (recentLogs.empty) {
        const blocks = createLogBlocks(userName, action, "A2218室", formatTimestamp());
        await sendSlackMessage(blocks);
        console.log(`Direct key status notification: ${userName} ${action}`);
      }
    } catch (error) {
      console.error("Error in onUserKeyStatusChange:", error);
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

    const blocks = createLogBlocks(testUser, jpAction, jpRoom, formatTimestamp());

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