import { Timestamp } from 'firebase/firestore';

export interface FirebaseAuthUser {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  provider: string;
  slackUserId?: string;
  slackTeamId?: string;
}

export interface FirestoreUser {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  provider: string;
  slackUserId?: string;
  slackTeamId?: string;
  room2218: boolean;
  gradRoom: boolean;
  hasKey: boolean;
  lastActivity: Timestamp;
  createdAt: Timestamp;
}

export interface FirestoreLogEntry {
  id?: string;
  userId: string;
  userName: string;
  action: string;
  room: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

export type RoomType = 'room2218' | 'gradRoom';
export type ActionType = '入室' | '退室' | '鍵取得' | '鍵返却';

export interface AttendanceLog {
  userId: string;
  userName: string;
  action: ActionType;
  room: string;
}