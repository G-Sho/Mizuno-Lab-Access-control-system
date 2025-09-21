import { Timestamp } from 'firebase/firestore';
import { ROOM_TYPES, USER_STATUS } from '@/constants';

// 基本的なユーザー情報
export interface BaseUser {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  provider: string;
  slackUserId?: string;
  slackTeamId?: string;
}

// Firebase認証ユーザー
export interface FirebaseAuthUser extends BaseUser {}

// Firestoreに保存されるユーザー情報
export interface FirestoreUser extends BaseUser {
  room2218: boolean;
  gradRoom: boolean;
  hasKey: boolean;
  lastActivity: Timestamp;
  createdAt: Timestamp;
}

// ログエントリ
export interface FirestoreLogEntry {
  id?: string;
  userId: string;
  userName: string;
  action: string;
  room: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

// 型安全な定数の型
export type RoomType = typeof ROOM_TYPES[keyof typeof ROOM_TYPES];
export type UserStatusType = typeof USER_STATUS[keyof typeof USER_STATUS];
export type ActionType = '入室' | '退室' | '鍵取得' | '鍵返却';

// 出席ログ
export interface AttendanceLog {
  userId: string;
  userName: string;
  action: ActionType;
  room: string;
}

// UI コンポーネントのプロップス型
export interface IconSize {
  size?: 'sm' | 'md' | 'lg';
}

export interface LoadingState {
  loading: boolean;
  error: string | null;
}

// フック関連の型
export interface AuthState extends LoadingState {
  currentUser: FirebaseAuthUser | null;
  authLoading: boolean;
  authError: string | null;
}

export interface AttendanceState extends LoadingState {
  handleRoomToggle: (roomType: RoomType) => Promise<void>;
  handleKeyToggle: () => Promise<void>;
}