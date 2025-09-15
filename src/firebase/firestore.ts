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
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';

// Data types are now exported from ../types
import { FirestoreUser, FirestoreLogEntry, AttendanceLog } from '../types';

// Re-export types for backward compatibility
export type { FirestoreUser, FirestoreLogEntry } from '../types';

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
    console.error('Error saving user:', error);
    throw new Error('ユーザー情報の保存に失敗しました');
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
    console.error('Error getting users:', error);
    throw new Error('ユーザー一覧の取得に失敗しました');
  }
};

export const updateUserRoomStatus = async (
  uid: string, 
  roomType: 'room2218' | 'gradRoom', 
  status: boolean
): Promise<void> => {
  try {
    const userRef = doc(usersCollection, uid);
    await updateDoc(userRef, {
      [roomType]: status,
      lastActivity: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating room status:', error);
    throw new Error('入退室状況の更新に失敗しました');
  }
};

export const updateUserKeyStatus = async (uid: string, hasKey: boolean): Promise<void> => {
  try {
    // まず他のユーザーの鍵を外す
    if (hasKey) {
      const allUsers = await getAllUsers();
      const promises = allUsers
        .filter(u => u.uid !== uid && u.hasKey)
        .map(u => updateDoc(doc(usersCollection, u.uid), { 
          hasKey: false,
          lastActivity: serverTimestamp()
        }));
      await Promise.all(promises);
    }
    
    // 対象ユーザーの鍵状況を更新
    const userRef = doc(usersCollection, uid);
    await updateDoc(userRef, {
      hasKey,
      lastActivity: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating key status:', error);
    throw new Error('鍵状況の更新に失敗しました');
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
    console.error('Error adding log:', error);
    throw new Error('ログの追加に失敗しました');
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
    console.error('Error in users subscription:', error);
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
    console.error('Error in logs subscription:', error);
  });
};

// データリセット（開発/テスト用）
export const resetAllData = async (): Promise<void> => {
  try {
    // 全ユーザー削除
    const usersSnapshot = await getDocs(usersCollection);
    const userDeletePromises = usersSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // 全ログ削除
    const logsSnapshot = await getDocs(logsCollection);
    const logDeletePromises = logsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all([...userDeletePromises, ...logDeletePromises]);
  } catch (error) {
    console.error('Error resetting data:', error);
    throw new Error('データのリセットに失敗しました');
  }
};