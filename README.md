# 研究室入退室管理システム

工学院大学水野研究室の入退室管理システム。Slack連携・リアルタイム同期・PWA対応。

🔗 **ライブ**: https://mizuno-lab-access-control.web.app

## ✨ 機能

- **Slack OAuth認証** - ワークスペース限定ログイン
- **入退室管理** - 2218号室（鍵付き）・院生室
- **鍵管理** - 排他制御・リアルタイム追跡
- **Slack通知** - 自動投稿・日本時間表示
- **PWA対応** - アプリとしてインストール可能
- **リアルタイム同期** - 複数デバイス間の即座な状態更新

## 🛠️ 技術構成

- **Frontend**: Next.js 15 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Functions, Hosting)
- **PWA**: Workbox + Service Worker + Web App Manifest
- **API**: Slack OAuth 2.0 + Bot/User Token

## 🚀 セットアップ

### 1. インストール
```bash
git clone <repository-url>
cd Mizuno-Lab-Access-control-system
npm install
cd functions && npm install && cd ..
```

### 2. Firebase設定
```bash
firebase login
firebase use --add
```

### 3. 環境変数
`.env`ファイルを作成：
```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
SLACK_CLIENT_ID=your_slack_client_id
```

### 4. Slack App設定
Firebase Functionsに設定：
```bash
firebase functions:config:set \
  slack.client_id="CLIENT_ID" \
  slack.client_secret="CLIENT_SECRET" \
  slack.channel_id="CHANNEL_ID"
```

必要なスコープ：
- **Bot**: `users:read`, `users:read.email`, `users.profile:read`, `chat:write`
- **User**: `chat:write`

## 📱 開発・デプロイ

```bash
# 開発
npm run dev

# ビルド
npm run build

# デプロイ
firebase deploy
```

## 📋 使い方

1. **ログイン** - Slackアカウントで認証
2. **入退室** - 部屋のボタンをクリック
3. **鍵管理** - 2218号室の鍵チェックボックス操作
4. **状況確認** - リアルタイムで在室者・鍵状況を表示
5. **PWAインストール** - ブラウザの「アプリとして追加」

## 📁 構造

```
├── app/                    # Next.js App Router
├── src/
│   ├── components/         # UIコンポーネント
│   ├── constants/          # 定数管理
│   ├── hooks/              # カスタムフック
│   ├── firebase/           # Firebase設定
│   └── types/              # TypeScript型
├── functions/              # Cloud Functions
├── public/                 # 静的ファイル・PWA
└── firebase.json           # Firebase設定
```

## 🔒 セキュリティ

- Firestore セキュリティルール適用
- Slack OAuth 2.0 認証
- ワークスペース限定アクセス
- トークン暗号化推奨

---

💡 **問題・要望**: [Issues](https://github.com/G-Sho/Mizuno-Lab-Access-control-system/issues)で報告