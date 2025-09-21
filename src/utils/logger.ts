/**
 * 本番環境とデバッグ環境のログ管理ユーティリティ
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  // デバッグ情報（開発環境のみ）
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  // 一般的な情報ログ（開発環境のみ）
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  // 警告（常に出力）
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  // エラー（常に出力）
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  // 重要な情報（常に出力）
  important: (...args: any[]) => {
    console.log('[IMPORTANT]', ...args);
  }
};

// Firebase Functions用のロガー
export const functionsLogger = {
  debug: (...args: any[]) => {
    // Firebase Functionsでは環境変数の判定が異なる
    if (!isProduction) {
      console.log('[FUNCTIONS-DEBUG]', ...args);
    }
  },

  info: (...args: any[]) => {
    if (!isProduction) {
      console.log('[FUNCTIONS-INFO]', ...args);
    }
  },

  warn: (...args: any[]) => {
    console.warn('[FUNCTIONS-WARN]', ...args);
  },

  error: (...args: any[]) => {
    console.error('[FUNCTIONS-ERROR]', ...args);
  },

  important: (...args: any[]) => {
    console.log('[FUNCTIONS-IMPORTANT]', ...args);
  }
};