import { FirebaseAuthUser } from '../types';
import { logger } from '../utils/logger';

type SlackAuthPayload = {
  type: 'SLACK_AUTH_SUCCESS' | 'SLACK_AUTH_ERROR';
  user?: FirebaseAuthUser;
  customToken?: string | null;
  state?: string;
  error?: string;
};

class SlackAuthService {
  private clientId: string;
  private readonly authResultKey = 'slackAuthResult';
  private readonly allowedMessageOrigins = [
    'https://slackoauthcallback-ili5e72mnq-uc.a.run.app',
    'https://mizuno-lab-access-control.web.app',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

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
        body: JSON.stringify({
          origin: typeof window !== 'undefined' ? window.location.origin : undefined
        }),
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
      return this.generateClientSideState();
    }
  }

  // クライアント側でのセキュアなstate生成（モバイル対応）
  private generateClientSideState(): string {
    try {
      // crypto.getRandomValuesが利用可能な場合
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      }
    } catch (error) {
      console.warn('crypto.getRandomValues not available:', error);
    }

    // フォールバック: Math.randomを使用（セキュリティは低下するが互換性重視）
    console.warn('Using fallback random state generation for compatibility');
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result;
  }

  // stateの保存と検証（モバイル対応）
  private storeState(state: string): void {
    try {
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_state_timestamp', Date.now().toString());
    } catch (error) {
      console.warn('SessionStorage not available, using fallback storage');
      // フォールバック: メモリ内に保存
      (window as any)._oauthState = state;
      (window as any)._oauthTimestamp = Date.now().toString();
    }
  }

  private validateState(state: string): boolean {
    try {
      const storedState = sessionStorage.getItem('oauth_state');
      const timestamp = sessionStorage.getItem('oauth_state_timestamp');
      return this.doValidateState(state, storedState, timestamp);
    } catch (error) {
      console.warn('SessionStorage not available, using fallback storage');
      // フォールバック: メモリから取得
      const storedState = (window as any)._oauthState;
      const timestamp = (window as any)._oauthTimestamp;
      return this.doValidateState(state, storedState, timestamp);
    }
  }

  private doValidateState(state: string, storedState: string | null, timestamp: string | null): boolean {

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
    try {
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_state_timestamp');
    } catch (error) {
      // フォールバック: メモリからクリア
      delete (window as any)._oauthState;
      delete (window as any)._oauthTimestamp;
    }
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
            window.removeEventListener('storage', storageListener);
            authCompleted = true;
          };

          const readStoredAuthResult = (): SlackAuthPayload | null => {
            try {
              const raw = localStorage.getItem(this.authResultKey);
              return raw ? JSON.parse(raw) : null;
            } catch {
              return null;
            }
          };

          const clearStoredAuthResult = () => {
            try {
              localStorage.removeItem(this.authResultKey);
            } catch {
              // ignore
            }
          };

          const handleAuthPayload = (payload: SlackAuthPayload) => {
            if (authCompleted) {
              return;
            }

            if (payload.type === 'SLACK_AUTH_SUCCESS') {
              if (!payload.state || !this.validateState(payload.state)) {
                cleanup();
                popup.close();
                this.clearState();
                clearStoredAuthResult();
                reject(new Error('認証エラー: 不正なリクエストです。'));
                return;
              }

              cleanup();
              popup.close();
              this.clearState();
              clearStoredAuthResult();

              const user = payload.user;
              const customToken = payload.customToken;

              if (!user) {
                cleanup();
                popup.close();
                this.clearState();
                clearStoredAuthResult();
                reject(new Error('認証情報が不足しています。'));
                return;
              }

              logger.debug('Received custom token:', !!customToken);

              if (customToken) {
                try {
                  sessionStorage.setItem('firebaseCustomToken', customToken);
                } catch (error) {
                  console.warn('Failed to store custom token in sessionStorage');
                  (window as any)._firebaseCustomToken = customToken;
                }
              }

              try {
                sessionStorage.setItem('slackAuthUser', JSON.stringify(user));
              } catch (error) {
                console.warn('Failed to store user in sessionStorage');
                (window as any)._slackAuthUser = user;
              }
              resolve(user);
            } else if (payload.type === 'SLACK_AUTH_ERROR') {
              cleanup();
              popup.close();
              this.clearState();
              clearStoredAuthResult();
              reject(new Error(payload.error || '認証に失敗しました。'));
            }
          };

          // ポップアップからのメッセージを監視
          const messageListener = (event: MessageEvent) => {
            // セキュリティ：Firebase Functionsからのメッセージのみ受信
            if (!this.allowedMessageOrigins.includes(event.origin)) {
              return;
            }

            try {
              const payload = typeof event.data === 'string'
                ? JSON.parse(event.data)
                : event.data;
              handleAuthPayload(payload as SlackAuthPayload);
            } catch (error) {
              console.warn('Failed to parse auth payload from postMessage');
            }
          };

          const storageListener = (event: StorageEvent) => {
            if (event.key !== this.authResultKey || !event.newValue) {
              return;
            }
            try {
              const payload = JSON.parse(event.newValue) as SlackAuthPayload;
              handleAuthPayload(payload);
            } catch (error) {
              console.warn('Failed to parse auth payload from storage');
            }
          };

          window.addEventListener('message', messageListener);
          window.addEventListener('storage', storageListener);

          const initialPayload = readStoredAuthResult();
          if (initialPayload) {
            handleAuthPayload(initialPayload);
          }

          // 5分のタイムアウト設定
          timeoutHandler = setTimeout(() => {
            if (!authCompleted) {
              cleanup();
              popup.close();

              // 最終確認としてセッションストレージをチェック
              const storedPayload = readStoredAuthResult();
              if (storedPayload) {
                handleAuthPayload(storedPayload);
                return;
              }

              const finalUser = this.getStoredSlackUser();
              if (finalUser) {
                resolve(finalUser);
              } else {
                reject(new Error('認証がタイムアウトしました。再度お試しください。'));
              }
            }
          }, 300000);

          // ポップアップが閉じられた場合の処理（短い間隔でチェック）
          checkClosed = setInterval(() => {
            if (popup.closed && !authCompleted) {
              cleanup();

              // 少し待ってからセッションストレージを確認
              setTimeout(() => {
                const storedPayload = readStoredAuthResult();
                if (storedPayload) {
                  handleAuthPayload(storedPayload);
                  return;
                }

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

  // セッションからSlackユーザーを取得（モバイル対応）
  getStoredSlackUser(): FirebaseAuthUser | null {
    try {
      const stored = sessionStorage.getItem('slackAuthUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      // フォールバック: メモリから取得
      try {
        const fallbackUser = (window as any)._slackAuthUser;
        return fallbackUser || null;
      } catch {
        return null;
      }
    }
  }

  // Custom Tokenを取得（モバイル対応）
  getStoredCustomToken(): string | null {
    try {
      return sessionStorage.getItem('firebaseCustomToken');
    } catch {
      // フォールバック: メモリから取得
      try {
        return (window as any)._firebaseCustomToken || null;
      } catch {
        return null;
      }
    }
  }

  // ログアウト（モバイル対応）
  signOut(): void {
    try {
      sessionStorage.removeItem('slackAuthUser');
      sessionStorage.removeItem('firebaseCustomToken');
      localStorage.removeItem(this.authResultKey);
    } catch {
      // フォールバック: メモリからクリア
      delete (window as any)._slackAuthUser;
      delete (window as any)._firebaseCustomToken;
    }
    this.clearState(); // OAuth state もクリア
  }
}

export const slackAuthService = new SlackAuthService();
