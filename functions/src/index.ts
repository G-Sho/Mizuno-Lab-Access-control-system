import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Firebase Admin初期化
admin.initializeApp();

const db = admin.firestore();

// Slack Webhook URLは環境変数から取得
const SLACK_WEBHOOK_URL = functions.config().slack?.webhook_url;

// タイムスタンプを日本時間でフォーマットする共通関数
function formatTimestamp(timestamp?: FirebaseFirestore.Timestamp | Date): string {
  let date: Date;

  if (timestamp && typeof timestamp.toDate === "function") {
    // Firestore Timestampの場合
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    // Dateオブジェクトの場合
    date = timestamp;
  } else {
    // timestampがない場合は現在時刻を使用
    date = new Date();
  }

  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// Slack メッセージ送信関数（リトライ機能付き）
async function sendSlackMessage(message: string, retryCount = 3): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("Slack webhook URL not configured");
    return;
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
          username: "研究室入退室管理システム",
          icon_emoji: ":office:",
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} - ${response.statusText}`);
      }

      // 成功した場合はリターン
      return;
    } catch (error) {
      console.error(`Failed to send Slack message (attempt ${attempt}/${retryCount}):`, error);

      // 最後の試行でない場合は少し待機してからリトライ
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        // 全ての試行が失敗した場合
        console.error("All retry attempts failed for Slack message:", message);
      }
    }
  }
}

// 入退室メッセージフォーマット
function formatAttendanceMessage(
  userName: string,
  action: string,
  room: string,
  timestamp: string
): string {
  const preposition = action === "入室" ? "に" : "から";
  return `*${userName}* さんが *${room}* ${preposition} *${action}* しました\n` +
         `時刻: ${timestamp}`;
}

// 鍵管理メッセージフォーマット  
function formatKeyMessage(
  userName: string,
  action: string,
  timestamp: string,
  keyHolderName?: string
): string {
  let message = `*${userName}* さんが *${action}* しました\n`;
  
  if (keyHolderName && action === "鍵取得") {
    message += `現在の鍵保持者: *${keyHolderName}*\n`;
  } else if (action === "鍵返却") {
    message += "鍵は詰所に戻りました\n";
  }
  
  message += `時刻: ${timestamp}`;
  return message;
}

// Firestoreのlogsコレクションへの書き込みを監視
export const onLogCreate = functions.firestore
  .document("logs/{logId}")
  .onCreate(async (snapshot, _context) => {
    try {
      const logData = snapshot.data();
      
      if (!logData) {
        console.error("Log data is empty");
        return;
      }

      const {
        userName,
        action,
        room,
        timestamp,
      } = logData;

      // タイムスタンプをフォーマット（日本時間）
      const formattedTime = formatTimestamp(timestamp);

      let message: string;

      if (action === "鍵取得" || action === "鍵返却") {
        // 鍵の取得/返却の場合、現在の鍵保持者を取得
        let keyHolderName: string | undefined;
        
        if (action === "鍵取得") {
          const usersSnapshot = await db.collection("users")
            .where("hasKey", "==", true)
            .limit(1)
            .get();
          
          if (!usersSnapshot.empty) {
            keyHolderName = usersSnapshot.docs[0].data().name;
          }
        }
        
        message = formatKeyMessage(userName, action, formattedTime, keyHolderName);
      } else {
        // 通常の入退室の場合
        message = formatAttendanceMessage(userName, action, room, formattedTime);
      }

      // Slackにメッセージを送信
      await sendSlackMessage(message);
      
      console.log(`Slack notification sent for user ${userName}: ${action} at ${room}`);
    } catch (error) {
      console.error("Error in onLogCreate function:", error);
    }
  });

// 鍵の状態変更を監視（ログ作成を伴わない直接的な状態変更のみ通知）
export const onUserKeyStatusChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      // hasKeyフィールドの変更をチェック
      if (beforeData.hasKey !== afterData.hasKey) {
        const userId = context.params.userId;
        const userName = afterData.name;
        const action = afterData.hasKey ? "鍵取得" : "鍵返却";

        // 最近（5秒以内）に同じユーザーの同じアクションのログが作成されているかチェック
        // これにより onLogCreate との重複通知を防ぐ
        const fiveSecondsAgo = new Date(Date.now() - 5000);
        const recentLogsSnapshot = await db.collection("logs")
          .where("userId", "==", userId)
          .where("action", "==", action)
          .where("timestamp", ">", fiveSecondsAgo)
          .limit(1)
          .get();

        // 最近のログがない場合のみ通知（直接的な状態変更）
        if (recentLogsSnapshot.empty) {
          const formattedTime = formatTimestamp();

          let keyHolderName: string | undefined;
          if (afterData.hasKey) {
            keyHolderName = userName;
          }

          const message = formatKeyMessage(userName, action, formattedTime, keyHolderName);
          await sendSlackMessage(message);

          console.log(`Direct key status notification sent for user ${userName}: ${action}`);
        } else {
          console.log(`Skipping duplicate key notification for user ${userName}: ${action} (recent log exists)`);
        }
      }
    } catch (error) {
      console.error("Error in onUserKeyStatusChange function:", error);
    }
  });

// 手動でSlackメッセージを送信するHTTPS関数（テスト用）
export const sendTestMessage = functions.https.onRequest(async (req, res) => {
  try {
    const message = req.body?.message || "テストメッセージです";
    await sendSlackMessage(message);
    res.json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Test message error:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// データリセット用の関数（開発時のみ使用）
export const resetData = functions.https.onRequest(async (req, res) => {
  try {
    // 本番環境では実行させない
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Not allowed in production" });
      return;
    }
    
    // 全ユーザーを削除
    const usersSnapshot = await db.collection("users").get();
    const userDeletePromises = usersSnapshot.docs.map(doc => doc.ref.delete());
    
    // 全ログを削除
    const logsSnapshot = await db.collection("logs").get();
    const logDeletePromises = logsSnapshot.docs.map(doc => doc.ref.delete());
    
    await Promise.all([...userDeletePromises, ...logDeletePromises]);
    
    // Slack通知
    await sendSlackMessage("データがリセットされました");
    
    res.json({ success: true, message: "Data reset successfully" });
  } catch (error) {
    console.error("Reset data error:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});