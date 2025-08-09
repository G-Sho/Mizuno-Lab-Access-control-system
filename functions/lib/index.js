"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetData = exports.sendTestMessage = exports.onUserKeyStatusChange = exports.onLogCreate = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Firebase Admin初期化
admin.initializeApp();
const db = admin.firestore();
// Slack Webhook URLは環境変数から取得
const SLACK_WEBHOOK_URL = (_a = functions.config().slack) === null || _a === void 0 ? void 0 : _a.webhook_url;
// Slack メッセージ送信関数
async function sendSlackMessage(message) {
    if (!SLACK_WEBHOOK_URL) {
        console.warn("Slack webhook URL not configured");
        return;
    }
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
            throw new Error(`Slack API error: ${response.status}`);
        }
    }
    catch (error) {
        console.error("Failed to send Slack message:", error);
    }
}
// 入退室メッセージフォーマット
function formatAttendanceMessage(userName, action, room, timestamp) {
    const preposition = action === "入室" ? "に" : "から";
    return `*${userName}* さんが *${room}* ${preposition} *${action}* しました\n` +
        `時刻: ${timestamp}`;
}
// 鍵管理メッセージフォーマット  
function formatKeyMessage(userName, action, timestamp, keyHolderName) {
    let message = `*${userName}* さんが *${action}* しました\n`;
    if (keyHolderName && action === "鍵取得") {
        message += `現在の鍵保持者: *${keyHolderName}*\n`;
    }
    else if (action === "鍵返却") {
        message += "鍵は詰所に戻りました\n";
    }
    message += `時刻: ${timestamp}`;
    return message;
}
// Firestoreのlogsコレクションへの書き込みを監視
exports.onLogCreate = functions.firestore
    .document("logs/{logId}")
    .onCreate(async (snapshot, _context) => {
    var _a, _b;
    try {
        const logData = snapshot.data();
        if (!logData) {
            console.error("Log data is empty");
            return;
        }
        const { userName, action, room, timestamp, } = logData;
        // タイムスタンプをフォーマット（日本時間）
        const formattedTime = ((_b = (_a = timestamp === null || timestamp === void 0 ? void 0 : timestamp.toDate) === null || _a === void 0 ? void 0 : _a.call(timestamp)) === null || _b === void 0 ? void 0 : _b.toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })) || new Date().toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        let message;
        if (action === "鍵取得" || action === "鍵返却") {
            // 鍵の取得/返却の場合、現在の鍵保持者を取得
            let keyHolderName;
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
        }
        else {
            // 通常の入退室の場合
            message = formatAttendanceMessage(userName, action, room, formattedTime);
        }
        // Slackにメッセージを送信
        await sendSlackMessage(message);
        console.log(`Slack notification sent for user ${userName}: ${action} at ${room}`);
    }
    catch (error) {
        console.error("Error in onLogCreate function:", error);
    }
});
// 鍵の状態変更を監視（追加の通知用）
exports.onUserKeyStatusChange = functions.firestore
    .document("users/{userId}")
    .onUpdate(async (change, _context) => {
    try {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        // hasKeyフィールドの変更をチェック
        if (beforeData.hasKey !== afterData.hasKey) {
            const userName = afterData.name;
            const action = afterData.hasKey ? "鍵取得" : "鍵返却";
            const timestamp = new Date().toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
            let keyHolderName;
            if (afterData.hasKey) {
                keyHolderName = userName;
            }
            const message = formatKeyMessage(userName, action, timestamp, keyHolderName);
            await sendSlackMessage(message);
            console.log(`Key status notification sent for user ${userName}: ${action}`);
        }
    }
    catch (error) {
        console.error("Error in onUserKeyStatusChange function:", error);
    }
});
// 手動でSlackメッセージを送信するHTTPS関数（テスト用）
exports.sendTestMessage = functions.https.onRequest(async (req, res) => {
    var _a;
    try {
        const message = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.message) || "テストメッセージです";
        await sendSlackMessage(message);
        res.json({ success: true, message: "Message sent successfully" });
    }
    catch (error) {
        console.error("Test message error:", error);
        res.status(500).json({ success: false, error: String(error) });
    }
});
// データリセット用の関数（開発時のみ使用）
exports.resetData = functions.https.onRequest(async (req, res) => {
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
    }
    catch (error) {
        console.error("Reset data error:", error);
        res.status(500).json({ success: false, error: String(error) });
    }
});
//# sourceMappingURL=index.js.map