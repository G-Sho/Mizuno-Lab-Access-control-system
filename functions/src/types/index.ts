export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email: string;
  image_192: string;
  team_id: string;
}

export interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  scope: string;
  user_id: string;
  team_id: string;
  enterprise_id?: string;
  team_name: string;
  authed_user?: {
    id?: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
}

export interface FirebaseAuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  slackId: string;
  teamId: string;
}

export interface AttendanceLog {
  id?: string;
  userId: string;
  timestamp: number;
  action: 'enter' | 'exit';
  method: 'slack' | 'manual';
  deviceInfo?: string;
  location?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  slackId: string;
  teamId: string;
  encryptedSlackToken: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  lastLoginAt?: number;
}

export interface OAuthCallbackData {
  code: string;
  state: string;
  error?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface SlackMessageBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

export interface SlackMessage {
  text: string;
  blocks?: SlackMessageBlock[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  error?: Error;
}