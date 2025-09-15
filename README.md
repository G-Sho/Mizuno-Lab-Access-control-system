# 研究室入退室管理システム

TypeScriptとFirebaseを使った研究室の入退室管理システムです。リアルタイム同期とSlack通知機能を備えています。

## 🚀 機能

### 認証・ユーザー管理
- **Google OAuth認証**: Firebase Authenticationによる安全なログイン
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
- **自動通知**: 入退室・鍵の取得/返却時に自動でSlack投稿
- **日本時間表示**: JST（Asia/Tokyo）での正確な時刻表示
- **重複防止**: Cloud Functionsによる賢い通知制御

## 🛠️ 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Vite** (開発・ビルドツール)
- **Tailwind CSS** (スタイリング)
- **Lucide React** (アイコンライブラリ)

### バックエンド・インフラ
- **Firebase Authentication** (Google OAuth)
- **Cloud Firestore** (NoSQLデータベース)
- **Cloud Functions** (Node.js 18, TypeScript)
- **Firebase Hosting** (静的サイトホスティング)

### 開発ツール
- **TypeScript 5.0**
- **ESLint** (コード品質)
- **PostCSS** + **Autoprefixer**

## 📋 必要な環境

- Node.js 18以上
- Firebase CLI
- Firebaseプロジェクト（Authentication, Firestore, Functions, Hosting有効）
- Slack Workspace（通知機能を使う場合）

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

`.env`ファイルを編集してFirebaseの設定値を入力：
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Slack Webhook設定（オプション）
```bash
# Firebase FunctionsにSlack Webhook URLを設定
firebase functions:config:set slack.webhook_url="YOUR_SLACK_WEBHOOK_URL"
```

### 5. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで http://localhost:5173 にアクセス

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
1. **ログイン**: 「Googleでログイン」ボタンをクリック
2. **自動登録**: 初回ログイン時にユーザー情報が自動登録される

### 日常的な操作
1. **入室**: 該当する部屋の「入室」ボタンをクリック
2. **退室**: 該当する部屋の「退室」ボタンをクリック
3. **鍵管理**: A2218室で鍵を持っている場合はチェックボックスを操作
4. **状況確認**: 右側パネルで現在の在室者と鍵の所在を確認
5. **履歴確認**: 下部パネルで最近の入退室履歴を確認

## 📁 プロジェクト構造

```
├── src/
│   ├── components/
│   │   ├── auth/           # 認証関連コンポーネント
│   │   ├── room/           # 入退室管理コンポーネント
│   │   └── ui/             # UI共通コンポーネント
│   ├── hooks/              # カスタムフック
│   ├── firebase/           # Firebase設定・API
│   ├── types/              # TypeScript型定義
│   └── App.tsx             # メインアプリケーション
├── functions/
│   └── src/
│       └── index.ts        # Cloud Functions（Slack通知）
├── public/                 # 静的ファイル
└── firebase.json           # Firebase設定
```

## 🧩 主要コンポーネント

### フロントエンド
- **App.tsx**: メインアプリケーションロジック
- **RoomCard**: 入退室操作UI（A2218室/院生室）
- **CurrentStatus**: 現在の在室状況表示
- **ActivityHistory**: 入退室履歴表示
- **useAuth**: 認証状態管理
- **useFirestore**: Firestoreデータ管理
- **useAttendance**: 入退室操作ロジック

### バックエンド
- **onLogCreate**: ログ作成時のSlack通知トリガー
- **onUserKeyStatusChange**: 鍵状態変更の監視
- **sendTestMessage**: テスト用メッセージ送信（HTTPS関数）
- **resetData**: 開発用データリセット（HTTPS関数）

## 📊 データ構造

### Firestoreコレクション

#### `users` (ユーザー情報)
```typescript
{
  uid: string;           // Firebase Auth UID
  name: string;          // 表示名
  email: string;         // メールアドレス
  avatar?: string;       // プロフィール画像URL
  provider: string;      // 認証プロバイダー
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
npm run dev              # 開発サーバー起動
npm run build           # 本番ビルド
npm run preview         # ビルド結果のプレビュー

# 品質管理
npm run typecheck       # TypeScript型チェック
npm run lint            # ESLintチェック（設定されていない）

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

### Firebase Authentication
- Google OAuth認証のみ有効
- セキュアなトークンベース認証
- 自動的なセッション管理

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
- 日本時間（JST）での時刻表示
- リトライ機能付きのHTTPリクエスト
- 重複通知防止機能

## 🚨 注意事項

- 本番環境では適切なFirestoreセキュリティルールを設定してください
- Slack Webhook URLは機密情報として適切に管理してください
- resetData関数は開発環境でのみ使用してください

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesまでお知らせください。