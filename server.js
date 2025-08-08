import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sendSlackMessage, formatAttendanceMessage, formatKeyMessage } from './slack-utils.js';

// 環境変数読み込み
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'dist')));

// 共有データストア（本来はRedisやDBを使用）
let sharedData = {
  users: [],
  logs: []
};

// Socket.IO接続処理
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 初期データを送信
  socket.emit('initial-data', sharedData);

  // ユーザー登録
  socket.on('user-register', (userData) => {
    console.log('User registered:', userData);
    
    // 既存ユーザーチェック
    const existingIndex = sharedData.users.findIndex(u => u.id === userData.id);
    if (existingIndex >= 0) {
      sharedData.users[existingIndex] = userData;
    } else {
      sharedData.users.push(userData);
    }
    
    // 全クライアントに更新を通知
    io.emit('users-updated', sharedData.users);
  });

  // 入退室更新
  socket.on('room-update', async (updateData) => {
    console.log('Room update:', updateData);
    
    const userIndex = sharedData.users.findIndex(u => u.id === updateData.userId);
    if (userIndex >= 0) {
      sharedData.users[userIndex] = { ...sharedData.users[userIndex], ...updateData.userData };
    }

    // ログ追加
    if (updateData.logEntry) {
      sharedData.logs.unshift(updateData.logEntry);
      // 最新50件に制限
      sharedData.logs = sharedData.logs.slice(0, 50);
    }

    // 全クライアントに更新を通知
    io.emit('users-updated', sharedData.users);
    io.emit('logs-updated', sharedData.logs);

    // Slackにメッセージ送信
    if (updateData.logEntry && updateData.sendToSlack !== false) {
      const user = sharedData.users[userIndex] || {};
      const message = formatAttendanceMessage(updateData.logEntry, user);
      
      try {
        await sendSlackMessage(message);
      } catch (error) {
        console.error('Failed to send Slack message:', error);
      }
    }
  });

  // 鍵管理更新
  socket.on('key-update', async (updateData) => {
    console.log('Key update:', updateData);
    
    const userIndex = sharedData.users.findIndex(u => u.id === updateData.userId);
    if (userIndex >= 0) {
      // 他のユーザーの鍵を外す（一人だけが鍵を持てる）
      sharedData.users.forEach(u => u.hasKey = false);
      sharedData.users[userIndex].hasKey = updateData.hasKey;
    }

    // ログ追加
    if (updateData.logEntry) {
      sharedData.logs.unshift(updateData.logEntry);
      sharedData.logs = sharedData.logs.slice(0, 50);
    }

    // 全クライアントに更新を通知
    io.emit('users-updated', sharedData.users);
    io.emit('logs-updated', sharedData.logs);

    // Slackに鍵管理メッセージ送信
    if (updateData.logEntry && updateData.sendToSlack !== false) {
      const user = sharedData.users[userIndex] || {};
      const keyHolder = sharedData.users.find(u => u.hasKey);
      const message = formatKeyMessage(updateData.logEntry, user, keyHolder?.name);
      
      try {
        await sendSlackMessage(message);
      } catch (error) {
        console.error('Failed to send Slack key message:', error);
      }
    }
  });

  // 接続解除
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// APIエンドポイント（データリセット用）
app.post('/api/reset', (req, res) => {
  sharedData = { users: [], logs: [] };
  io.emit('data-reset');
  res.json({ message: 'Data reset successfully' });
});

// SPA用のルート処理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://192.168.1.27:${PORT}`);
  console.log(`📱 Mobile friendly for demos!`);
});