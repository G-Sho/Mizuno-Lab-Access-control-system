import { useState } from 'react';
import {
  updateUserRoomStatus,
  updateUserKeyStatus,
  addLog
} from '../firebase/firestore';
import { FirebaseAuthUser, FirestoreUser, RoomType } from '../types';

export const useAttendance = (
  currentUser: FirebaseAuthUser | null,
  users: FirestoreUser[]
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoomToggle = async (roomType: RoomType) => {
    if (!currentUser) {
      console.error('No current user found');
      return;
    }

    console.log('handleRoomToggle called:', {
      roomType,
      currentUser: {
        uid: currentUser.uid,
        name: currentUser.name,
        email: currentUser.email
      }
    });

    setLoading(true);
    setError(null);
    try {
      const currentUserData = users.find(u => u.uid === currentUser.uid);
      const isEntering = !currentUserData?.[roomType];

      console.log('Current user data:', currentUserData);
      console.log('Is entering:', isEntering);

      await updateUserRoomStatus(currentUser.uid, roomType, isEntering);

      await addLog({
        userId: currentUser.uid,
        userName: currentUser.name,
        action: isEntering ? '入室' : '退室',
        room: roomType === 'room2218' ? 'A2218室' : '院生室'
      });

    } catch (error: any) {
      console.error('Error in handleRoomToggle:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyToggle = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const currentUserData = users.find(u => u.uid === currentUser.uid);
      const newKeyState = !currentUserData?.hasKey;
      
      await updateUserKeyStatus(currentUser.uid, newKeyState);
      
      await addLog({
        userId: currentUser.uid,
        userName: currentUser.name,
        action: newKeyState ? '鍵取得' : '鍵返却',
        room: 'A2218室'
      });
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    handleRoomToggle,
    handleKeyToggle
  };
};