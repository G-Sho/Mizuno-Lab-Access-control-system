import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

import { FirestoreUser, FirestoreLogEntry, AttendanceLog } from '../types';
import {
  handleFirestoreError,
  withErrorHandling,
  Result,
  logError
} from '../utils/errorHandler';
import { logger } from '../utils/logger';

// コレクション参照
const usersCollection = collection(db, 'users');
const logsCollection = collection(db, 'logs');

// ユーザー関連の操作
export const saveUser = async (user: Omit<FirestoreUser, 'createdAt' | 'lastActivity'>): Promise<void> => {
  try {
    const userRef = doc(usersCollection, user.uid);
    const existingUser = await getDoc(userRef);
    
    const now = serverTimestamp();
    
    if (existingUser.exists()) {
      // 既存ユーザーの更新（room2218, gradRoom, hasKeyは既存の値を保持）
      await updateDoc(userRef, {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        lastActivity: now
      });
    } else {
      // 新規ユーザーの作成
      await setDoc(userRef, {
        ...user,
        createdAt: now,
        lastActivity: now
      });
    }
  } catch (error) {
    const firestoreError = handleFirestoreError(error);
    logError(firestoreError, 'saveUser');
    throw firestoreError;
  }
};


export const getAllUsers = async (): Promise<FirestoreUser[]> => {
  try {
    const querySnapshot = await getDocs(usersCollection);
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as FirestoreUser));
  } catch (error) {
    const firestoreError = handleFirestoreError(error);
    logError(firestoreError, 'getAllUsers');
    throw firestoreError;
  }
};

export const updateUserRoomStatus = async (
  uid: string,
  roomType: 'room2218' | 'gradRoom',
  status: boolean
): Promise<void> => {
  try {
    logger.debug('Updating room status for UID:', uid, 'Room:', roomType, 'Status:', status);
    const userRef = doc(usersCollection, uid);
    await updateDoc(userRef, {
      [roomType]: status,
      lastActivity: serverTimestamp()
    });
  } catch (error) {
    logger.error('Error updating room status:', error instanceof Error ? error.message : String(error));
    logger.debug('Error details:', {
      uid,
      roomType,
      status
    });
    const firestoreError = handleFirestoreError(error);
    logError(firestoreError, 'updateUserRoomStatus');
    throw firestoreError;
  }
};

export const updateUserKeyStatus = async (uid: string, hasKey: boolean): Promise<void> => {
  try {
    // 鍵を取得する場合、他のユーザーが鍵を持っているかチェック
    if (hasKey) {
      const allUsers = await getAllUsers();
      const otherKeyHolder = allUsers.find(u => u.uid !== uid && u.hasKey);

      if (otherKeyHolder) {
        // 他のユーザーが鍵を持っている場合はエラー
        throw new Error(`${otherKeyHolder.name}さんが既に鍵を持っています。先に返却してもらってください。`);
      }
    }

    // 対象ユーザーの鍵状況を更新（自分のデータのみ）
    const userRef = doc(usersCollection, uid);
    await updateDoc(userRef, {
      hasKey,
      lastActivity: serverTimestamp()
    });
  } catch (error) {
    const firestoreError = handleFirestoreError(error);
    logError(firestoreError, 'updateUserKeyStatus');
    throw firestoreError;
  }
};

// ログ関連の操作
export const addLog = async (log: AttendanceLog): Promise<void> => {
  try {
    await addDoc(logsCollection, {
      ...log,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    const firestoreError = handleFirestoreError(error);
    logError(firestoreError, 'addLog');
    throw firestoreError;
  }
};


// リアルタイム監視
export const subscribeToUsers = (callback: (users: FirestoreUser[]) => void) => {
  return onSnapshot(usersCollection, (snapshot) => {
    const users: FirestoreUser[] = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as FirestoreUser));
    callback(users);
  }, (error) => {
    logger.error('Error in users subscription:', error instanceof Error ? error.message : String(error));
    // エラーが発生した場合は空の配列を返す
    callback([]);
  });
};

export const subscribeToLogs = (callback: (logs: FirestoreLogEntry[]) => void) => {
  const q = query(logsCollection, orderBy('timestamp', 'desc'), limit(50));

  return onSnapshot(q, (snapshot) => {
    const logs: FirestoreLogEntry[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FirestoreLogEntry));
    callback(logs);
  }, (error) => {
    logger.error('Error in logs subscription:', error instanceof Error ? error.message : String(error));
    // エラーが発生した場合は空の配列を返す
    callback([]);
  });
};

