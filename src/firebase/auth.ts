import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './config';
import { FirebaseAuthUser } from '../types';
import { slackAuthService } from '../services/slackAuth';

// 認証状態変更の通知コールバック
let currentAuthCallback: ((user: FirebaseAuthUser | null) => void) | null = null;

// Slack OAuth認証を開始
export const signInWithSlack = async (): Promise<FirebaseAuthUser | null> => {
  try {
    const user = await slackAuthService.signInWithPopup();

    // 認証状態変更を手動で通知（遅延実行で確実に呼び出し）
    setTimeout(() => {
      if (currentAuthCallback) {
        currentAuthCallback(user);
      }
    }, 100);

    return user;
  } catch (error: any) {
    throw new Error(`Slack認証エラー: ${error.message}`);
  }
};

// サインアウト
export const signOut = async (): Promise<void> => {
  try {
    // Slack認証情報をクリア
    slackAuthService.signOut();

    // 認証状態変更を手動で通知
    if (currentAuthCallback) {
      currentAuthCallback(null);
    }

    // Firebase認証からもサインアウト（必要に応じて）
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
  } catch (error) {
    throw new Error('サインアウトに失敗しました');
  }
};

// 認証状態の監視（Slack認証対応）
export const onAuthStateChange = (callback: (user: FirebaseAuthUser | null) => void) => {
  // 現在のコールバックを保存
  currentAuthCallback = callback;

  // 初回チェック（一度だけ）
  const slackUser = slackAuthService.getStoredSlackUser();

  // 即座にコールバックを呼び出し（初回のみ）
  callback(slackUser);

  // Firebase認証の監視（Slackユーザーがいない場合のみ有効）
  const firebaseUnsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    const currentSlackUser = slackAuthService.getStoredSlackUser();

    // Slackユーザーがいる場合はFirebase認証を無視
    if (currentSlackUser) {
      return;
    }

    // Firebase認証の処理

    if (user) {
      const authUser: FirebaseAuthUser = {
        uid: user.uid,
        name: user.displayName || user.email || 'Unknown User',
        email: user.email || '',
        avatar: user.photoURL || undefined,
        provider: user.providerData[0]?.providerId || 'firebase'
      };
      callback(authUser);
    } else {
      callback(null);
    }
  });

  return () => {
    firebaseUnsubscribe();
    currentAuthCallback = null;
  };
};

