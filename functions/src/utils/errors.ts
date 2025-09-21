export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: number;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = Date.now();
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '認証に失敗しました', context?: Record<string, any>) {
    super(message, 401, true, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'アクセス権限がありません', context?: Record<string, any>) {
    super(message, 403, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'リソースが見つかりません', context?: Record<string, any>) {
    super(message, 404, true, context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '競合が発生しました', context?: Record<string, any>) {
    super(message, 409, true, context);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = '内部サーバーエラーが発生しました', context?: Record<string, any>) {
    super(message, 500, false, context);
  }
}

export class SlackAPIError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(`Slack API Error: ${message}`, 502, true, context);
  }
}

export class EncryptionError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(`Encryption Error: ${message}`, 500, true, context);
  }
}

export class OAuthError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(`OAuth Error: ${message}`, 400, true, context);
  }
}

export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

export function handleError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, {
      originalError: error.name,
      stack: error.stack
    });
  }

  return new InternalServerError('Unknown error occurred', {
    error: String(error)
  });
}