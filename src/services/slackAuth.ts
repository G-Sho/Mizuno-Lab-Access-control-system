import { FirebaseAuthUser } from '../types';
import { logger } from '../utils/logger';

class SlackAuthService {
  private clientId: string;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID || '';
  }

  // セキュアなランダムstate生成
  private async generateState(): Promise<string> {
    try {
      // 新しいサーバー側state生成APIを使用
      const response = await fetch('https://generatestate-ili5e72mnq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`State generation failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.state) {
        throw new Error('Invalid state response from server');
      }

      return data.state;
    } catch (error) {
      // フォールバック: クライアント側で生成（互換性のため）
      console.warn('Failed to generate server-side state, using fallback:', error);
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
  }

  // stateの保存と検証
  private storeState(state: string): void {
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_state_timestamp', Date.now().toString());
  }

  private validateState(state: string): boolean {
    const storedState = sessionStorage.getItem('oauth_state');
    const timestamp = sessionStorage.getItem('oauth_state_timestamp');

    // stateが一致し、10分以内に作成されたものか確認
    if (!storedState || !timestamp || storedState !== state) {
      return false;
    }

    const stateAge = Date.now() - parseInt(timestamp);
    const maxAge = 10 * 60 * 1000; // 10分

    if (stateAge > maxAge) {
      this.clearState();
      return false;
    }

    return true;
  }

  private clearState(): void {
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_state_timestamp');
  }

  // Slack OAuth認証を開始（ポップアップウィンドウ）
  async signInWithPopup(): Promise<FirebaseAuthUser> {
    return new Promise(async (resolve, reject) => {
      // 既存のセッションストレージをチェック
      const existingUser = this.getStoredSlackUser();
      if (existingUser) {
        resolve(existingUser);
        return;
      }

        try {
          // CSRF保護のためのstateパラメータ生成と保存
          const state = await this.generateState();
          this.storeState(state);

          const authUrl = this.getAuthUrl(state);
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
              // stateパラメータを検証してCSRF攻撃を防ぐ
              if (!event.data.state || !this.validateState(event.data.state)) {
                cleanup();
                popup.close();
                this.clearState();
                reject(new Error('認証エラー: 不正なリクエストです。'));
                return;
              }

              cleanup();
              popup.close();
              this.clearState();
              const user = event.data.user;
              const customToken = event.data.customToken;

              logger.debug('Received custom token:', !!customToken);

              // Custom Tokenが含まれている場合は保存
              if (customToken) {
                sessionStorage.setItem('firebaseCustomToken', customToken);
              }

              // セッションストレージに保存
              sessionStorage.setItem('slackAuthUser', JSON.stringify(user));
              resolve(user);
            } else if (event.data.type === 'SLACK_AUTH_ERROR') {
              cleanup();
              popup.close();
              this.clearState();
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
        } catch (error) {
          reject(new Error(`認証の初期化に失敗しました: ${error}`));
        }
    });
  }

  // Slack OAuth URLを生成（stateパラメータ付き）
  private getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: 'users:read,users:read.email,users.profile:read,chat:write',
      redirect_uri: 'https://slackoauthcallback-ili5e72mnq-uc.a.run.app',
      response_type: 'code',
      user_scope: 'chat:write',
      state: state, // CSRF保護のためのstateパラメータ
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

  // Custom Tokenを取得
  getStoredCustomToken(): string | null {
    try {
      return sessionStorage.getItem('firebaseCustomToken');
    } catch {
      return null;
    }
  }

  // ログアウト
  signOut(): void {
    sessionStorage.removeItem('slackAuthUser');
    sessionStorage.removeItem('firebaseCustomToken');
    this.clearState(); // OAuth state もクリア
  }
}

export const slackAuthService = new SlackAuthService();