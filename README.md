# 研究室入退室管理システム

Next.jsとFirebaseを使った研究室の入退室管理システムです。リアルタイム同期とSlack通知機能を備えています。

🔗 **ライブデモ**: https://mizuno-lab-access-control.web.app

## 🚀 機能

### 認証・ユーザー管理
- **Slack OAuth認証**: Slack OAuthによる安全なログイン
- **自動ユーザー登録**: 初回ログイン時に自動でFirestoreにユーザー情報を保存

### 入退室管理
- **A2218室（鍵付き）**: 入退室記録と鍵管理機能
- **院生室**: 入退室記録
- **リアルタイム同期**: Firestoreによる即座な状態更新
- **履歴表示**: 最近の入退室ログの表示

### 鍵管理システム
- **排他制御**: 一人だけが鍵を保持可能
- **状態追跡**: 鍵の所在をリアルタイムで管理
- **自動通知**: 鍵の取得・返却時にSlack通知

### Slack通知
- **ユーザー本人投稿**: ユーザートークンでユーザー本人として投稿
- **ボットフォールバック**: 投稿に失敗した場合はボットが代替投稿
- **日本時間表示**: JST（Asia/Tokyo）での正確な時刻表示
- **重複防止**: Cloud Functionsによる賢い通知制御

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 15** + **React 18** + **TypeScript**
- **Tailwind CSS** (スタイリング)
- **Lucide React** (アイコンライブラリ)
- **Static Site Generation** (SSG)

### バックエンド・インフラ
- **Firebase Authentication** (Slack OAuth)
- **Cloud Firestore** (NoSQLデータベース)
- **Cloud Functions** (Node.js 18, TypeScript)
- **Firebase Hosting** (静的サイトホスティング)

### 開発ツール
- **TypeScript 5.0**
- **ESLint** + **Next.js ESLint Config**
- **PostCSS** + **Autoprefixer**

## 📋 必要な環境

- Node.js 18以上
- Firebase CLI
- Firebaseプロジェクト（Authentication, Firestore, Functions, Hosting有効）
- Slack App（OAuth認証と通知機能用）

## 🚦 セットアップ

### 1. プロジェクトの準備
```bash
# リポジトリをクローン
git clone <repository-url>
cd Mizuno-Lab-Access-control-system

# 依存関係をインストール
npm install
cd functions && npm install && cd ..
```

### 2. Firebase設定
```bash
# Firebase CLIにログイン
firebase login

# プロジェクトを選択
firebase use --add
```

### 3. 環境変数の設定
```bash
# 環境変数ファイルをコピー
cp .env.example .env
```

`.env`ファイルを編集してFirebaseとSlackの設定値を入力：
```env
# Firebase設定（NextJS用）
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Slack OAuth設定
SLACK_CLIENT_ID=your_slack_client_id
```

### 4. Slack App設定
**前提**: Slack Developer Console (https://api.slack.com/apps) でアプリを作成済み

#### OAuth & Permissions設定
- **Redirect URLs**: `https://your-cloud-function-url` (Firebase Functionsデプロイ後)
- **Bot Token Scopes**:
  - `users:read`
  - `users:read.email`
  - `users.profile:read`
  - `chat:write`
- **User Token Scopes**:
  - `chat:write`

#### Firebase Functions環境変数設定
```bash
# Slack認証情報をFunctionsに設定
firebase functions:config:set \
  slack.client_id="YOUR_SLACK_CLIENT_ID" \
  slack.client_secret="YOUR_SLACK_CLIENT_SECRET" \
  slack.channel_id="YOUR_SLACK_CHANNEL_ID"
```

### 5. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

## 🚀 デプロイ

### フロントエンドのデプロイ
```bash
npm run build
firebase deploy --only hosting
```

### Cloud Functionsのデプロイ
```bash
firebase deploy --only functions
```

### 全体のデプロイ
```bash
firebase deploy
```

## 💡 使い方

### 初回利用
1. **ログイン**: 「Slackでログイン」ボタンをクリック
2. **自動登録**: 初回ログイン時にユーザー情報が自動登録される

### 日常的な操作
1. **入室**: 該当する部屋の「入室」ボタンをクリック
2. **退室**: 該当する部屋の「退室」ボタンをクリック
3. **鍵管理**: A2218室で鍵を持っている場合はチェックボックスを操作
4. **状況確認**: 右側パネルで現在の在室者と鍵の所在を確認
5. **履歴確認**: 下部パネルで最近の入退室履歴を確認

## 📁 プロジェクト構造

```
├── app/
│   ├── globals.css         # グローバルCSS
│   ├── layout.tsx          # ルートレイアウト
│   └── page.tsx            # メインページ
├── src/
│   ├── components/
│   │   ├── auth/           # 認証関連コンポーネント
│   │   ├── room/           # 入退室管理コンポーネント
│   │   └── ui/             # UI共通コンポーネント
│   ├── hooks/              # カスタムフック
│   ├── firebase/           # Firebase設定・API
│   ├── services/           # サービス層（Slack OAuth）
│   └── types/              # TypeScript型定義
├── functions/
│   └── src/
│       └── index.ts        # Cloud Functions（Slack通知）
├── public/                 # 静的ファイル
├── next.config.js          # Next.js設定
└── firebase.json           # Firebase設定
```

## 🧩 主要コンポーネント

### フロントエンド
- **app/page.tsx**: メインアプリケーションロジック
- **RoomCard**: 入退室操作UI（A2218室/院生室）
- **CurrentStatus**: 現在の在室状況表示
- **ActivityHistory**: 入退室履歴表示
- **LoginScreen**: Slack OAuth認証UI
- **SlackAuthService**: Slack OAuth認証サービス
- **useAuth**: 認証状態管理
- **useFirestore**: Firestoreデータ管理
- **useAttendance**: 入退室操作ロジック

### バックエンド
- **slackOAuthCallback**: Slack OAuth認証コールバック処理
- **onLogCreate**: ログ作成時のSlack通知トリガー
- **onUserKeyStatusChange**: 鍵状態変更の監視
- **sendTestMessage**: テスト用メッセージ送信（HTTPS関数）
- **debugTest**: デバッグ用テスト関数
- **resetData**: 開発用データリセット（HTTPS関数）

## 📊 データ構造

### Firestoreコレクション

#### `users` (ユーザー情報)
```typescript
{
  uid: string;           // Firebase Auth UID（slack_xxxxx形式）
  name: string;          // 表示名
  email: string;         // メールアドレス
  avatar?: string;       // プロフィール画像URL
  provider: string;      // 認証プロバイダー（slack）
  slackUserId: string;   // Slack ユーザーID
  slackTeamId: string;   // Slack チームID
  slackUserToken: string; // Slack ユーザートークン（暗号化推奨）
  room2218: boolean;     // A2218室在室状態
  gradRoom: boolean;     // 院生室在室状態
  hasKey: boolean;       // 鍵保持状態
  lastActivity: Timestamp;
  createdAt: Timestamp;
}
```

#### `logs` (入退室ログ)
```typescript
{
  userId: string;        // ユーザーUID
  userName: string;      // ユーザー名
  action: string;        // アクション（入室/退室/鍵取得/鍵返却）
  room: string;          // 部屋名
  timestamp: Timestamp;  // 実行時刻
  metadata?: object;     // 追加メタデータ
}
```

## 🔧 利用可能なスクリプト

```bash
# 開発
npm run dev              # Next.js開発サーバー起動
npm run build           # 本番ビルド（静的サイト生成）
npm run start           # 本番サーバー起動（未使用）

# 品質管理
npm run lint            # ESLint + Next.js設定でのチェック

# Firebase Functions
cd functions
npm run build           # TypeScriptコンパイル
npm run build:watch     # ウォッチモードでコンパイル
npm run serve           # エミュレーター起動
npm run deploy          # Functionsデプロイ
```

## 🛡️ セキュリティ

### Firestore セキュリティルール
- 認証されたユーザーのみアクセス可能
- ユーザーは自分のデータのみ編集可能
- ログは全ユーザーが読取り可能、書込みは制限

### Slack OAuth認証
- Slack OAuth 2.0による安全な認証
- セキュアなトークンベース認証
- セッションストレージによる状態管理
- ポップアップベースの認証フロー

## 🔍 主な機能の実装

### リアルタイム同期
- Firestoreのリアルタイムリスナーを使用
- 複数デバイス間での即座な状態同期
- useFirestoreフックによる効率的なデータ管理

### 鍵管理の排他制御
- hasKeyフィールドによる簡潔な実装
- クライアントサイドでの状態チェック
- Cloud Functionsでの通知制御

### Slack通知システム
- Cloud Functions トリガーベース
- ユーザートークンによる本人投稿機能
- ボットトークンによるフォールバック投稿
- 日本時間（JST）での時刻表示
- リトライ機能付きのHTTPリクエスト
- 重複通知防止機能

## 🚨 注意事項

- 本番環境では適切なFirestoreセキュリティルールを設定してください
- Slack OAuth認証情報（Client ID, Client Secret）は機密情報として適切に管理してください
- Slack ユーザートークンは暗号化してFirestoreに保存することを推奨します
- resetData関数は開発環境でのみ使用してください
- Next.js Static Site Generation (SSG) を使用しているため、環境変数はビルド時に埋め込まれます

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesまでお知らせください。