import { useState, useEffect } from 'react';
import {
  signInWithSlack,
  signOut,
  onAuthStateChange
} from '../firebase/auth';
import { FirebaseAuthUser } from '../types';
import { saveUser } from '../firebase/firestore';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthStateChange = async (user: FirebaseAuthUser | null) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        try {
          // 新規ユーザーのみ初期値で保存、既存ユーザーは基本情報のみ更新
          await saveUser({
            uid: user.uid,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            provider: user.provider,
            room2218: false,  // 新規ユーザーのみ使用される
            gradRoom: false,  // 新規ユーザーのみ使用される
            hasKey: false     // 新規ユーザーのみ使用される
          });
        } catch (error) {
          // エラーは無視（非必須処理）
        }
      }
    };

    const unsubscribe = onAuthStateChange(handleAuthStateChange);
    return () => unsubscribe();
  }, []); // 依存配列を空にして、マウント時のみ実行

  const handleSlackLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithSlack();
      if (result) {
        // 即座にユーザー状態を更新してローディング状態を解除
        setCurrentUser(result);
        setAuthLoading(false);
      }
    } catch (error: any) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  return {
    currentUser,
    authLoading,
    authError,
    handleSlackLogin,
    handleLogout
  };
};