// デバッグ用：環境変数の確認
// 本番環境では削除してください

export const checkEnvVars = () => {
  console.log('Environment Variables Check:');
  console.log('VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Set ✓' : 'Not Set ✗');
  console.log('VITE_SLACK_CLIENT_ID:', import.meta.env.VITE_SLACK_CLIENT_ID ? 'Set ✓' : 'Not Set ✗');
  
  // 実際の値を表示（セキュリティ上、一部のみ表示）
  const googleId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (googleId && googleId !== 'your_google_client_id_here') {
    console.log('Google Client ID (first 20 chars):', googleId.substring(0, 20) + '...');
  }
};