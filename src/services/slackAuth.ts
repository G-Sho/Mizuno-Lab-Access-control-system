import { FirebaseAuthUser } from '../types';

class SlackAuthService {
  private clientId: string;

  constructor() {
    this.clientId = import.meta.env.VITE_SLACK_CLIENT_ID || '';
  }

  // Slack OAuth認証を開始（ポップアップウィンドウ）
  signInWithPopup(): Promise<FirebaseAuthUser> {
    return new Promise((resolve, reject) => {
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

      let checkClosed: NodeJS.Timeout;

      // ポップアップからのメッセージを監視
      const messageListener = (event: MessageEvent) => {
        // セキュリティ：Firebase Functionsからのメッセージのみ受信
        if (event.origin !== 'https://us-central1-mizuno-lab-access-control.cloudfunctions.net') {
          console.log('Ignoring message from origin:', event.origin);
          return;
        }

        console.log('Received message from Firebase Functions:', event.data);

        if (event.data.type === 'SLACK_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          const user = event.data.user;

          // セッションストレージに保存
          sessionStorage.setItem('slackAuthUser', JSON.stringify(user));
          console.log('Auth success - user saved to session:', user);
          resolve(user);
        } else if (event.data.type === 'SLACK_AUTH_ERROR') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageListener);

      // ポップアップが閉じられた場合の処理
      checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          reject(new Error('認証がキャンセルされました。'));
        }
      }, 1000);
    });
  }

  // Slack OAuth URLを生成
  private getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: 'users:read,users:read.email,users.profile:read',
      redirect_uri: 'https://us-central1-mizuno-lab-access-control.cloudfunctions.net/slackOAuthCallback',
      response_type: 'code',
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