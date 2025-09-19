import { FirebaseAuthUser } from '../types';

class SlackAuthService {
  private clientId: string;

  constructor() {
    this.clientId = process.env.SLACK_CLIENT_ID || '';
  }

  // Slack OAuth認証を開始（ポップアップウィンドウ）
  signInWithPopup(): Promise<FirebaseAuthUser> {
    return new Promise((resolve, reject) => {
      // 既存のセッションストレージをチェック
      const existingUser = this.getStoredSlackUser();
      if (existingUser) {
        resolve(existingUser);
        return;
      }

      const authUrl = this.getAuthUrl();
      const popup = window.open(
        authUrl,
        'SlackAuth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        reject(new Error('ポップアップがブロックされました。ブラウザの設定を確認してください。'));
        return;
      }

      let authCompleted = false;
      let checkClosed: NodeJS.Timeout;
      let timeoutHandler: NodeJS.Timeout;

      const cleanup = () => {
        if (checkClosed) clearInterval(checkClosed);
        if (timeoutHandler) clearTimeout(timeoutHandler);
        window.removeEventListener('message', messageListener);
        authCompleted = true;
      };

      // ポップアップからのメッセージを監視
      const messageListener = (event: MessageEvent) => {
        // セキュリティ：Firebase Functionsからのメッセージのみ受信
        if (event.origin !== 'https://slackoauthcallback-ili5e72mnq-uc.a.run.app') {
          return;
        }

        if (event.data.type === 'SLACK_AUTH_SUCCESS') {
          cleanup();
          popup.close();
          const user = event.data.user;

          // セッションストレージに保存
          sessionStorage.setItem('slackAuthUser', JSON.stringify(user));
          resolve(user);
        } else if (event.data.type === 'SLACK_AUTH_ERROR') {
          cleanup();
          popup.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageListener);

      // 30秒のタイムアウト設定
      timeoutHandler = setTimeout(() => {
        if (!authCompleted) {
          cleanup();
          popup.close();

          // 最終確認としてセッションストレージをチェック
          const finalUser = this.getStoredSlackUser();
          if (finalUser) {
            resolve(finalUser);
          } else {
            reject(new Error('認証がタイムアウトしました。再度お試しください。'));
          }
        }
      }, 30000);

      // ポップアップが閉じられた場合の処理（短い間隔でチェック）
      checkClosed = setInterval(() => {
        if (popup.closed && !authCompleted) {
          cleanup();

          // 少し待ってからセッションストレージを確認
          setTimeout(() => {
            const storedUser = this.getStoredSlackUser();
            if (storedUser) {
              resolve(storedUser);
            } else {
              reject(new Error('認証ウィンドウが閉じられました。再度お試しください。'));
            }
          }, 500);
        }
      }, 500);
    });
  }

  // Slack OAuth URLを生成
  private getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: 'users:read,users:read.email,users.profile:read,chat:write',
      redirect_uri: 'https://slackoauthcallback-ili5e72mnq-uc.a.run.app',
      response_type: 'code',
      user_scope: 'chat:write',
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  // セッションからSlackユーザーを取得
  getStoredSlackUser(): FirebaseAuthUser | null {
    try {
      const stored = sessionStorage.getItem('slackAuthUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // ログアウト
  signOut(): void {
    sessionStorage.removeItem('slackAuthUser');
  }
}

export const slackAuthService = new SlackAuthService();