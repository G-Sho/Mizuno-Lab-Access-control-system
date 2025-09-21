/**
 * 統一されたエラーハンドリングユーティリティ
 */

// カスタムエラータイプ
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'AUTH_ERROR', originalError);
    this.name = 'AuthError';
  }
}

export class FirestoreError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'FIRESTORE_ERROR', originalError);
    this.name = 'FirestoreError';
  }
}

export class SlackError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'SLACK_ERROR', originalError);
    this.name = 'SlackError';
  }
}

// エラーメッセージの標準化
export const ERROR_MESSAGES = {
  AUTH: {
    NO_PERMISSION: 'データベースへのアクセス権限がありません。認証を確認してください。',
    TIMEOUT: '認証がタイムアウトしました。再度お試しください。',
    INVALID_TOKEN: '認証トークンが無効です。',
    SIGN_IN_FAILED: 'サインインに失敗しました。',
    POPUP_BLOCKED: 'ポップアップがブロックされました。ブラウザの設定を確認してください。'
  },
  FIRESTORE: {
    PERMISSION_DENIED: 'データベースへのアクセス権限がありません。',
    NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください。',
    SAVE_FAILED: 'データの保存に失敗しました。',
    LOAD_FAILED: 'データの読み込みに失敗しました。'
  },
  SLACK: {
    API_ERROR: 'Slack APIエラーが発生しました。',
    TOKEN_INVALID: 'Slackトークンが無効です。',
    USER_NOT_FOUND: 'Slackユーザーが見つかりません。'
  }
} as const;

// Result型パターンの実装
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export const success = <T>(data: T): Result<T> => ({ success: true, data });
export const failure = <E extends AppError>(error: E): Result<never, E> => ({ success: false, error });

// Firestoreエラーの判定と変換
export function handleFirestoreError(error: unknown): FirestoreError {
  if (error instanceof Error) {
    if (error.message.includes('Missing or insufficient permissions')) {
      return new FirestoreError(ERROR_MESSAGES.FIRESTORE.PERMISSION_DENIED, error);
    }
    if (error.message.includes('network')) {
      return new FirestoreError(ERROR_MESSAGES.FIRESTORE.NETWORK_ERROR, error);
    }
    return new FirestoreError(error.message, error);
  }
  return new FirestoreError('不明なエラーが発生しました。');
}

// 認証エラーの判定と変換
export function handleAuthError(error: unknown): AuthError {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return new AuthError(ERROR_MESSAGES.AUTH.TIMEOUT, error);
    }
    if (error.message.includes('permission')) {
      return new AuthError(ERROR_MESSAGES.AUTH.NO_PERMISSION, error);
    }
    return new AuthError(error.message, error);
  }
  return new AuthError('認証エラーが発生しました。');
}

// ログ出力の統一
export function logError(error: AppError, context?: string): void {
  const prefix = context ? `[${context}]` : '';
  console.error(`${prefix} ${error.name}: ${error.message}`);
  if (error.originalError) {
    console.error('Original error:', error.originalError);
  }
}

// 非同期関数のエラーハンドリングラッパー
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler: (error: unknown) => AppError = handleFirestoreError
): (...args: T) => Promise<Result<R>> {
  return async (...args: T): Promise<Result<R>> => {
    try {
      const result = await fn(...args);
      return success(result);
    } catch (error) {
      const appError = errorHandler(error);
      logError(appError, fn.name);
      return failure(appError);
    }
  };
}