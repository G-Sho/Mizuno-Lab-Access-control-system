import { useState, useEffect } from 'react';
import {
  subscribeToUsers,
  subscribeToLogs
} from '../firebase/firestore';
import { FirestoreUser, FirestoreLogEntry } from '../types';
import { FirebaseAuthUser } from '../types';

export const useFirestore = (currentUser: FirebaseAuthUser | null) => {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [logs, setLogs] = useState<FirestoreLogEntry[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeUsers = subscribeToUsers((firestoreUsers) => {
      setUsers(firestoreUsers);
    });

    const unsubscribeLogs = subscribeToLogs((firestoreLogs) => {
      setLogs(firestoreLogs);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeLogs();
    };
  }, [currentUser]);

  return { users, logs };
};