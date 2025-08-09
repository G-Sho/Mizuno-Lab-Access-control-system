# 研究室入退室管理システム

研究室の入退室を管理するWebアプリケーションです。Firebaseを活用したリアルタイム同期とSlack通知機能を備えた本格的なシステムです。

## 🚀 機能

- **Firebase Authentication**: Google認証による安全なログイン
- **リアルタイム同期**: Firestoreによるリアルタイムデータ同期
- **入退室管理**: 2218室（鍵付き）と院生室の入退室記録
- **鍵管理**: 研究室の鍵の所在管理（一人だけが保持可能）
- **Slack通知**: Firebase Functionsを使った自動Slack通知（日本時間対応）
- **履歴表示**: 最近の入退室履歴の表示

## 🛠️ 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Vite** (ビルドツール)
- **Tailwind CSS** (スタイリング)
- **Lucide React** (アイコン)

### バックエンド
- **Firebase**
  - **Authentication** (Google OAuth)
  - **Firestore** (NoSQLデータベース)
  - **Functions** (サーバーレス関数)
  - **Hosting** (静的ホスティング)

## セットアップ手順

### 前提条件
- Node.js 18以上
- Firebase CLI
- Firebase プロジェクト

### ローカル開発環境

1. **リポジトリをクローン**
   ```bash
   git clone <repository-url>
   cd Mizuno-Lab-Access-control-system
   ```

2. **依存関係をインストール**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

3. **Firebase設定**
   ```bash
   # Firebase CLI にログイン
   firebase login
   
   # Firebaseプロジェクトを初期化
   firebase use --add
   ```

4. **環境変数を設定**
   ```bash
   cp .env.example .env
   # .envファイルを編集してFirebaseの設定を追加
   ```

5. **Slack Webhook設定（オプション）**
   ```bash
   # Firebase Functions の環境変数にSlack Webhook URLを設定
   firebase functions:config:set slack.webhook_url="YOUR_SLACK_WEBHOOK_URL"
   ```

6. **開発サーバーを起動**
   ```bash
   npm run dev
   ```
   
7. **ブラウザでアクセス**
   
   http://localhost:5173 にアクセスしてアプリケーションを確認

### Firebase デプロイ

1. **フロントエンドのデプロイ**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

2. **Functions のデプロイ**
   ```bash
   firebase deploy --only functions
   ```

3. **全体のデプロイ**
   ```bash
   firebase deploy
   ```

## 使い方

### 初回利用時

1. **Google認証でログイン**
   - 「Googleでログイン」ボタンをクリック
   - Googleアカウントでログイン
   - 初回ログイン時は自動的にユーザー登録される

### 日常的な利用

1. **入室**
   - 該当する部屋の「入室」ボタンをクリック
   - 2218室の場合、鍵を持っている場合はチェックボックスにチェック
   - Slackに自動通知される（日本時間で表示）

2. **退室**
   - 該当する部屋の「退室」ボタンをクリック
   - 2218室で鍵を返却する場合はチェックボックスを外す
   - Slackに自動通知される（日本時間で表示）

3. **現在の状況確認**
   - 右側のパネルで在室者と鍵の所在を確認
   - 履歴パネルで最近の動きを確認

4. **ログアウト**
   - ヘッダー右上の「ログアウト」をクリック

## 利用可能なスクリプト

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# ビルド結果をプレビュー
npm run preview

# TypeScript型チェック
npm run typecheck

# Firebase Functions の開発・デプロイ
cd functions && npm run build
firebase deploy --only functions
```

## データについて

- **保存場所**: Firebase Firestore
- **永続性**: クラウドに永続保存
- **共有**: リアルタイム同期で全デバイス間で共有
- **認証**: Firebase Authentication による安全なアクセス

## Firebase設定詳細

### Firebase Console での設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** を有効化
   - Sign-in method で Google を有効化
   - 認証ドメインにデプロイ先を追加
3. **Firestore Database** を作成
   - セキュリティルールを設定
4. **Functions** を有効化
   - Node.js 18 ランタイムを選択

### Slack Webhook 設定

1. [Slack API](https://api.slack.com/apps) でアプリを作成
2. 「Incoming Webhooks」を有効化
3. ワークスペースにアプリを追加してWebhook URLを取得
4. Firebase Functions の環境変数に設定:
   ```bash
   firebase functions:config:set slack.webhook_url="YOUR_WEBHOOK_URL"
   ```

## システム機能詳細

### 自動Slack通知
- 入退室時に自動でSlack通知
- 日本時間（JST）での正確な時刻表示
- 鍵の取得・返却状況も通知

### リアルタイム同期
- Firestore によるリアルタイムデータ同期
- 複数デバイス間での即座な状態更新

### セキュリティ
- Firebase Authentication による認証
- Firestore セキュリティルールによるアクセス制御

## 将来の拡張予定

- 管理者機能（ユーザー管理、統計表示）
- 統計・レポート機能
- モバイルアプリ対応
- 入退室履歴のCSVエクスポート

## サポート

問題や質問がある場合は、GitHubのIssuesまでお知らせください。

---

🤖 このプロジェクトはClaude Codeで生成されました。