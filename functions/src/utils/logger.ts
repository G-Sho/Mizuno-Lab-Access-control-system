/**
 * Firebase Functions用ログ管理ユーティリティ
 */

// Firebase Functionsではprod環境での実行時にNODE_ENVが設定されている
const isProduction = process.env.NODE_ENV === 'production' ||
                     process.env.FUNCTIONS_EMULATOR !== 'true';

export const functionsLogger = {
  // デバッグ情報（開発・テスト環境のみ）
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.log('[FUNCTIONS-DEBUG]', ...args);
    }
  },

  // 一般的な情報ログ（開発・テスト環境のみ）
  info: (...args: any[]) => {
    if (!isProduction) {
      console.log('[FUNCTIONS-INFO]', ...args);
    }
  },

  // 警告（常に出力）
  warn: (...args: any[]) => {
    console.warn('[FUNCTIONS-WARN]', ...args);
  },

  // エラー（常に出力）
  error: (...args: any[]) => {
    console.error('[FUNCTIONS-ERROR]', ...args);
  },

  // 重要な情報（常に出力）
  important: (...args: any[]) => {
    console.log('[FUNCTIONS-IMPORTANT]', ...args);
  },

  // OAuth関連の成功ログ（本番でも最小限出力）
  authSuccess: (userId: string) => {
    console.log('[AUTH-SUCCESS]', `User authenticated: ${userId.substring(0, 8)}...`);
  },

  // OAuth関連のエラーログ（本番でも出力）
  authError: (error: string) => {
    console.error('[AUTH-ERROR]', error);
  }
};