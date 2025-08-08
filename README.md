# 研究室入退室管理システム

研究室の入退室管理を簡単なWebアプリケーションで行うためのシステムです。Slackのチャット入力に代わり、ボタンとチェックボックスで楽な入退室管理を実現します。

## 機能

- 🚪 **入退室管理**: 2218室（鍵あり）と院生室の入退室をボタンで簡単操作
- 🔑 **鍵管理**: 2218室の鍵の所在を明確化
- 👥 **在室者表示**: 現在誰が研究室にいるかをリアルタイム表示
- 📝 **履歴確認**: 入退室と鍵の取得・返却履歴を確認
- 💾 **データ永続化**: ブラウザのLocalStorageでデータを保存
- 🔐 **OAuth認証**: Google・Slack認証対応（手動登録も可能）
- 👤 **ユーザー管理**: アバター表示、認証方法の識別

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Tailwind CSS
- **アイコン**: Lucide React
- **ビルドツール**: Vite
- **データ保存**: LocalStorage
- **デプロイ**: GitHub Pages

## セットアップ手順

### 前提条件
- Node.js 18以上

### ローカル開発環境

1. **リポジトリをクローン**
   ```bash
   git clone <repository-url>
   cd SampleApp
   ```

2. **依存関係をインストール**
   ```bash
   npm install
   ```

3. **環境変数を設定（OAuth使用時のみ）**
   ```bash
   cp .env.example .env
   # .envファイルを編集してOAuthクライアントIDを設定
   ```

4. **開発サーバーを起動**
   ```bash
   npm run dev
   ```
   
5. **ブラウザでアクセス**
   
   http://localhost:5173 にアクセスしてアプリケーションを確認

### GitHub Pagesデプロイ

1. **GitHub リポジトリにプッシュ**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **GitHub Actions設定**
   
   リポジトリの Settings > Pages > Source を「GitHub Actions」に設定

3. **自動デプロイ**
   
   mainブランチにプッシュすると自動的にビルド・デプロイされます

## 使い方

### 初回利用時

#### OAuth認証（推奨）
1. **Google認証**
   - 「Googleでログイン」ボタンをクリック
   - Googleアカウントでログイン

2. **Slack認証（デモ版）**
   - 「Slackでログイン（デモ）」ボタンをクリック
   - ランダムなデモユーザーでログイン

#### 手動登録
1. **新規登録**
   - 「お名前（手動登録）」フィールドに名前を入力
   - 「手動登録」ボタンをクリック

### 日常的な利用

1. **ログイン**
   - OAuth認証または既存ユーザー一覧から選択

2. **入室**
   - 該当する部屋の「入室」ボタンをクリック
   - 2218室の場合、鍵を持っている場合はチェックボックスにチェック

3. **退室**
   - 該当する部屋の「退室」ボタンをクリック
   - 2218室で鍵を返却する場合はチェックボックスを外す

4. **現在の状況確認**
   - 右側のパネルで在室者と鍵の所在を確認
   - 履歴パネルで最近の動きを確認

5. **ログアウト**
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
```

## データについて

- **保存場所**: ブラウザのLocalStorage
- **永続性**: ブラウザのデータをクリアするまで保持
- **共有**: 各ブラウザ・デバイス独立（将来的にサーバー連携予定）

## OAuth認証の設定

### Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. 「APIs & Services」→「Credentials」に移動
3. 「CREATE CREDENTIALS」→「OAuth 2.0 Client ID」を選択
4. Application type: 「Web application」
5. Authorized JavaScript origins: デプロイ先のドメインを追加
6. クライアントIDをコピーして`.env`の`VITE_GOOGLE_CLIENT_ID`に設定

### Slack OAuth設定（本格運用時）

1. [Slack API](https://api.slack.com/apps)でアプリを作成
2. 「OAuth & Permissions」で以下のスコープを追加:
   - `identity.basic`
   - `identity.email`
   - `identity.avatar`
3. Redirect URLsにアプリのURLを追加
4. Client IDを`.env`の`VITE_SLACK_CLIENT_ID`に設定

注意: 現在のSlack認証はデモ版です。本格運用にはバックエンドでのトークン交換が必要です。

## 将来の拡張予定

- リアルタイム同期
- ローカルサーバーでの運用
- 管理者機能
- 統計・レポート機能
- 完全なSlack OAuth実装

## サポート

問題や質問がある場合は、GitHubのIssuesまでお知らせください。

---

🤖 このプロジェクトはClaude Codeで生成されました。