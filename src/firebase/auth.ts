import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './config';
import { FirebaseAuthUser } from '../types';

// Re-export types for backward compatibility
export type { FirebaseAuthUser } from '../types';

// Google認証プロバイダー
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// 工学院大学のドメインチェック
const isKogakuinEmail = (email: string): boolean => {
  return email.endsWith('@g.kogakuin.jp') || email.endsWith('@cc.kogakuin.ac.jp');
};

// Google認証でサインイン（ポップアップ方式）
export const signInWithGoogle = async (): Promise<FirebaseAuthUser | null> => {
  try {
    console.log('Starting Google sign in with popup...');
    
    // ポップアップブロックを回避するため、ユーザー操作直後に実行
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    console.log('Google sign in successful:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    });
    
    // 工学院大学のドメインチェック
    if (!user.email || !isKogakuinEmail(user.email)) {
      // 認証されたユーザーをサインアウト
      await signOut();
      throw new Error('工学院大学のアカウント（@g.kogakuin.jp または @cc.kogakuin.ac.jp）でのみログインできます。');
    }
    
    return {
      uid: user.uid,
      name: user.displayName || user.email || 'Unknown User',
      email: user.email || '',
      avatar: user.photoURL || undefined,
      provider: 'google'
    };
  } catch (error: any) {
    console.error('Google sign in error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // 具体的なエラーメッセージを表示
    if (error.code === 'auth/popup-blocked') {
      throw new Error('ポップアップがブロックされています。ブラウザの設定を確認してください。');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('認証がキャンセルされました。');
    } else if (error.code === 'auth/unauthorized-domain') {
      console.error('Unauthorized domain error. Current domain:', window.location.origin);
      throw new Error('このドメインは認証が許可されていません。Firebase Console で設定を確認してください。');
    } else {
      console.error('Full error object:', error);
      throw new Error(`Google認証エラー: ${error.message} (Code: ${error.code})`);
    }
  }
};

// サインアウト
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('サインアウトに失敗しました');
  }
};

// 認証状態の監視
export const onAuthStateChange = (callback: (user: FirebaseAuthUser | null) => void) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    console.log('Firebase auth state changed:', user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      providerData: user.providerData
    } : null);
    
    if (user) {
      // 工学院大学ドメインのチェック
      if (!user.email || !isKogakuinEmail(user.email)) {
        console.log('Non-Kogakuin user detected, signing out...');
        await signOut();
        callback(null);
        return;
      }
      
      const authUser: FirebaseAuthUser = {
        uid: user.uid,
        name: user.displayName || user.email || 'Unknown User',
        email: user.email || '',
        avatar: user.photoURL || undefined,
        provider: user.providerData[0]?.providerId || 'firebase'
      };
      console.log('Calling callback with auth user:', authUser);
      callback(authUser);
    } else {
      console.log('Calling callback with null user');
      callback(null);
    }
  });
};

