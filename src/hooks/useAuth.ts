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

      // ユーザー情報の保存はログイン時のみ実行（認証状態変更のたびには実行しない）
      // saveUserは内部で既存ユーザーかどうかを判定し、新規の場合のみ初期値を設定する
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

        // ログイン成功時のみユーザー情報を保存
        try {
          await saveUser({
            uid: result.uid,
            name: result.name,
            email: result.email,
            avatar: result.avatar,
            provider: result.provider,
            room2218: false,  // 新規ユーザーのみ使用される
            gradRoom: false,  // 新規ユーザーのみ使用される
            hasKey: false     // 新規ユーザーのみ使用される
          });
        } catch (error) {
          // エラーは無視（非必須処理）
        }
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