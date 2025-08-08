// OAuth認証設定とヘルパー関数

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'google' | 'slack';
}

// Google OAuth設定
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_REDIRECT_URI = window.location.origin;

// Slack OAuth設定
const SLACK_CLIENT_ID = import.meta.env.VITE_SLACK_CLIENT_ID || 'YOUR_SLACK_CLIENT_ID';
const SLACK_REDIRECT_URI = window.location.origin;

// Google OAuth認証開始
export const initiateGoogleAuth = () => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'token',
    scope: 'openid email profile',
    state: 'google_auth'
  });
  
  window.location.href = `https://accounts.google.com/oauth/authorize?${params.toString()}`;
};

// Slack OAuth認証開始
export const initiateSlackAuth = () => {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    redirect_uri: SLACK_REDIRECT_URI,
    response_type: 'code',
    scope: 'identity.basic,identity.email,identity.avatar',
    state: 'slack_auth'
  });
  
  window.location.href = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
};

// URLパラメータからOAuth認証結果を解析
export const parseAuthFromUrl = async (): Promise<AuthUser | null> => {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const state = params.get('state') || hash.get('state');
  
  if (state === 'google_auth') {
    const accessToken = hash.get('access_token');
    if (accessToken) {
      return await fetchGoogleUserInfo(accessToken);
    }
  }
  
  if (state === 'slack_auth') {
    const code = params.get('code');
    if (code) {
      // 注意: クライアントサイドではSlackのcodeをtoken交換できないため
      // 実際の実装ではバックエンドが必要です
      console.warn('Slack OAuth requires backend implementation for token exchange');
      return null;
    }
  }
  
  return null;
};

// Google APIでユーザー情報取得
const fetchGoogleUserInfo = async (accessToken: string): Promise<AuthUser | null> => {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    const userInfo = await response.json();
    
    if (userInfo.id) {
      return {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.picture,
        provider: 'google'
      };
    }
  } catch (error) {
    console.error('Google user info fetch failed:', error);
  }
  
  return null;
};

// URLをクリーンアップ（OAuth認証後のパラメータを削除）
export const cleanupAuthUrl = () => {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  
  // OAuth関連のパラメータを削除
  params.delete('state');
  params.delete('code');
  params.delete('error');
  
  // hashからもOAuth関連を削除
  url.hash = '';
  url.search = params.toString();
  
  window.history.replaceState({}, document.title, url.toString());
};

// 簡易Slack認証（デモ用）
export const mockSlackAuth = (): AuthUser => {
  const mockUsers = [
    { id: 'slack_user_1', name: '田中太郎', email: 'tanaka@example.com' },
    { id: 'slack_user_2', name: '佐藤花子', email: 'sato@example.com' },
    { id: 'slack_user_3', name: '山田次郎', email: 'yamada@example.com' }
  ];
  
  const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
  
  return {
    ...randomUser,
    provider: 'slack'
  };
};