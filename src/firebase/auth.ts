import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously,
  User
} from 'firebase/auth';
import { auth } from './config';
import { FirebaseAuthUser } from '../types';
import { slackAuthService } from '../services/slackAuth';
import { handleAuthError, logError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

// 認証状態変更の通知コールバック
let currentAuthCallback: ((user: FirebaseAuthUser | null) => void) | null = null;

// Slack OAuth認証を開始
export const signInWithSlack = async (): Promise<FirebaseAuthUser | null> => {
  try {
    const user = await slackAuthService.signInWithPopup();

    // Custom Tokenを取得してFirebase Authにサインイン
    const customToken = slackAuthService.getStoredCustomToken();
    if (customToken) {
      logger.debug('Custom token found, signing in to Firebase Auth...');
      try {
        await signInWithCustomToken(auth, customToken);
        logger.info('Successfully signed in to Firebase Auth with custom token');

        // Custom Tokenは使い捨てなので削除
        sessionStorage.removeItem('firebaseCustomToken');
      } catch (error) {
        logger.warn('Failed to sign in with custom token:', error instanceof Error ? error.message : String(error));
        // Custom Tokenが無効でもSlack認証は成功しているので続行
      }
    } else {
      // Custom Tokenがない場合はAnonymous認証を試行
      logger.debug('No custom token found, trying anonymous authentication...');
      try {
        const result = await signInAnonymously(auth);
        logger.info('Successfully signed in anonymously to Firebase Auth');
        logger.debug('Anonymous UID:', result.user.uid);
      } catch (error) {
        logger.warn('Failed to sign in anonymously:', error instanceof Error ? error.message : String(error));
        // Anonymous認証も失敗した場合はFirestoreアクセスは制限される
      }
    }

    // Firebase Auth認証完了後に状態変更を通知（遅延実行で確実に呼び出し）
    setTimeout(() => {
      if (currentAuthCallback) {
        currentAuthCallback(user);
      }
    }, 200);

    return user;
  } catch (error) {
    const authError = handleAuthError(error);
    logError(authError, 'signInWithSlack');
    throw authError;
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
    const authError = handleAuthError(error);
    logError(authError, 'signOut');
    throw authError;
  }
};

// 認証状態の監視（Slack認証対応）
export const onAuthStateChange = (callback: (user: FirebaseAuthUser | null) => void) => {
  // 現在のコールバックを保存
  currentAuthCallback = callback;

  // 初回チェック（一度だけ）
  const slackUser = slackAuthService.getStoredSlackUser();
  const customToken = slackAuthService.getStoredCustomToken();

  // Custom Tokenがある場合は自動的にFirebase Authにサインイン
  if (slackUser && customToken) {
    logger.debug('Found stored custom token, attempting automatic sign-in...');
    signInWithCustomToken(auth, customToken)
      .then(() => {
        logger.info('Automatic Firebase Auth sign-in successful');
        // Custom Tokenは使い捨てなので削除
        sessionStorage.removeItem('firebaseCustomToken');
      })
      .catch((error) => {
        logger.warn('Automatic Firebase Auth sign-in failed:', error instanceof Error ? error.message : String(error));
        // 失敗してもSlackユーザー情報は有効なので続行
      });
  }

  // 即座にコールバックを呼び出し（初回のみ）
  callback(slackUser);

  // Firebase認証の監視（Slackユーザーがいない場合のみ有効）
  const firebaseUnsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    logger.debug('=== Firebase Auth State Changed ===');
    logger.debug('Firebase UID:', user?.uid, 'Is Anonymous:', user?.isAnonymous);

    const currentSlackUser = slackAuthService.getStoredSlackUser();
    logger.debug('Current Slack user exists:', !!currentSlackUser);

    // Slackユーザーがいる場合はFirebase認証を無視
    if (currentSlackUser) {
      logger.debug('Slack user exists, ignoring Firebase auth state change');
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

