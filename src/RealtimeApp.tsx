import { useState, useEffect } from 'react';
import { Clock, Users, Key, LogIn, LogOut, User, UserPlus, Wifi, WifiOff } from 'lucide-react';
import { initiateGoogleAuth, parseAuthFromUrl, cleanupAuthUrl, mockSlackAuth, AuthUser } from './auth';
import { useSocket } from './hooks/useSocket';

interface UserData {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  provider?: 'google' | 'slack' | 'manual';
  room2218: boolean;
  gradRoom: boolean;
  hasKey: boolean;
}

interface LogEntry {
  id: number;
  userId: string;
  userName: string;
  action: string;
  room: string;
  timestamp: string;
}

interface CurrentUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  provider?: 'google' | 'slack' | 'manual';
  authenticated: boolean;
}

const RealtimeLabAttendanceSystem = () => {
  // Socket.IO hook
  const { connected, users, logs, registerUser, updateRoom, updateKey } = useSocket();

  // ユーザー情報
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: '',
    name: '',
    authenticated: false
  });

  const [newUserName, setNewUserName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [slackEnabled, setSlackEnabled] = useState(true);

  // 時刻表示用
  const [currentTime, setCurrentTime] = useState(new Date());

  // OAuth認証結果の処理
  useEffect(() => {
    const handleAuthResult = async () => {
      setAuthLoading(true);
      setAuthError(null);
      
      try {
        const authUser = await parseAuthFromUrl();
        if (authUser) {
          await handleOAuthLogin(authUser);
          cleanupAuthUrl();
        }
      } catch (error) {
        console.error('Auth processing failed:', error);
        setAuthError('認証に失敗しました');
      } finally {
        setAuthLoading(false);
      }
    };

    const hasAuthParams = window.location.search.includes('state=') || 
                          window.location.hash.includes('state=');
    if (hasAuthParams) {
      handleAuthResult();
    }
  }, []);

  // 時刻更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // OAuth認証後のユーザー処理
  const handleOAuthLogin = async (authUser: AuthUser) => {
    // 既存ユーザーを検索
    let existingUser = users.find(u => u.email === authUser.email);
    
    const userData: UserData = {
      id: existingUser?.id || authUser.id,
      name: authUser.name,
      email: authUser.email,
      avatar: authUser.avatar,
      provider: authUser.provider,
      room2218: existingUser?.room2218 || false,
      gradRoom: existingUser?.gradRoom || false,
      hasKey: existingUser?.hasKey || false
    };
    
    // サーバーに登録
    registerUser(userData);
    
    // ログイン状態を設定
    setCurrentUser({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar,
      provider: userData.provider,
      authenticated: true
    });
  };

  // Google認証開始
  const handleGoogleLogin = () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      initiateGoogleAuth();
    } catch (error) {
      setAuthError('Google認証の開始に失敗しました');
      setAuthLoading(false);
    }
  };

  // Slack認証開始（デモ版）
  const handleSlackLogin = () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      setTimeout(() => {
        const mockUser = mockSlackAuth();
        handleOAuthLogin(mockUser);
        setAuthLoading(false);
      }, 1000);
    } catch (error) {
      setAuthError('Slack認証の開始に失敗しました');
      setAuthLoading(false);
    }
  };

  // 手動ユーザー登録
  const handleManualUserRegister = () => {
    if (!newUserName.trim()) return;
    
    const userData: UserData = {
      id: `manual_${Date.now()}`,
      name: newUserName.trim(),
      provider: 'manual',
      room2218: false,
      gradRoom: false,
      hasKey: false
    };
    
    registerUser(userData);
    setCurrentUser({
      id: userData.id,
      name: userData.name,
      provider: 'manual',
      authenticated: true
    });
    setNewUserName('');
  };

  // 既存ユーザーでログイン
  const handleUserLogin = (user: UserData) => {
    setCurrentUser({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      authenticated: true
    });
  };

  // ログアウト
  const handleLogout = () => {
    setCurrentUser({ id: '', name: '', authenticated: false });
  };

  // 入退室処理
  const handleRoomToggle = (roomType: keyof Pick<UserData, 'room2218' | 'gradRoom'>) => {
    const user = users.find(u => u.id === currentUser.id);
    if (!user) return;
    
    const isEntering = !user[roomType];
    
    const updatedUserData = { [roomType]: isEntering };

    // ログエントリ作成
    const logEntry: LogEntry = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      action: isEntering ? '入室' : '退室',
      room: roomType === 'room2218' ? '2218室' : '院生室',
      timestamp: new Date().toLocaleString('ja-JP')
    };
    
    updateRoom(currentUser.id, updatedUserData, logEntry);
  };

  // 鍵の管理
  const handleKeyToggle = () => {
    const user = users.find(u => u.id === currentUser.id);
    if (!user) return;
    
    const newKeyState = !user.hasKey;

    // ログエントリ作成
    const logEntry: LogEntry = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      action: newKeyState ? '鍵取得' : '鍵返却',
      room: '2218室',
      timestamp: new Date().toLocaleString('ja-JP')
    };
    
    updateKey(currentUser.id, newKeyState, logEntry);
  };

  const currentUserData = users.find(u => u.id === currentUser.id);
  const room2218Users = users.filter(u => u.room2218);
  const gradRoomUsers = users.filter(u => u.gradRoom);
  const keyHolder = users.find(u => u.hasKey);

  // 認証ローディング画面
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">認証処理中...</p>
        </div>
      </div>
    );
  }

  // 未認証時のログイン画面
  if (!currentUser.authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">研究室入退室管理</h1>
            <p className="text-gray-600">リアルタイム共有デモ</p>
            
            {/* 接続状態表示 */}
            <div className="mt-3">
              {connected ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm">サーバー接続中</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm">サーバー接続なし</span>
                </div>
              )}
            </div>
          </div>
          
          {/* エラー表示 */}
          {authError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {authError}
            </div>
          )}

          {/* OAuth認証ボタン */}
          <div className="space-y-3 mb-6">
            <button 
              onClick={handleGoogleLogin}
              disabled={authLoading || !connected}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Googleでログイン
            </button>
            
            <button 
              onClick={handleSlackLogin}
              disabled={authLoading || !connected}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.523 2.521h-2.521V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.521A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.523v-2.521h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Slackでログイン（デモ）
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>

          {/* 手動登録 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                お名前（手動登録）
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="名前を入力してください"
                onKeyPress={(e) => e.key === 'Enter' && handleManualUserRegister()}
                disabled={!connected}
              />
            </div>
            <button 
              onClick={handleManualUserRegister}
              disabled={!newUserName.trim() || !connected}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-5 h-5" />
              手動登録
            </button>
          </div>

          {/* 既存ユーザーでログイン */}
          {users.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">既存ユーザー</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleUserLogin(user)}
                    className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
                    ) : (
                      <User className="w-4 h-4 text-gray-600" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{user.name}</div>
                      {user.provider && (
                        <div className="text-xs text-gray-500 capitalize">
                          {user.provider === 'manual' ? '手動登録' : user.provider}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">研究室入退室管理（リアルタイム共有）</h1>
                <div className="flex items-center gap-2">
                  {currentUser.avatar && (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-5 h-5 rounded-full" />
                  )}
                  <p className="text-gray-600">ようこそ、{currentUser.name}さん</p>
                  {currentUser.provider && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize">
                      {currentUser.provider === 'manual' ? '手動' : currentUser.provider}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* 接続状態表示 */}
              {connected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs">リアルタイム同期中</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs">同期停止</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-5 h-5" />
                <span className="font-mono">{currentTime.toLocaleString('ja-JP')}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>

        {/* 操作パネル */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* 2218室 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Key className="w-6 h-6 text-yellow-600" />
              2218室（鍵あり）
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={() => handleRoomToggle('room2218')}
                disabled={!connected}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed ${
                  currentUserData?.room2218
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {currentUserData?.room2218 ? (
                  <>
                    <LogOut className="w-5 h-5" />
                    退室
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    入室
                  </>
                )}
              </button>

              {currentUserData?.room2218 && (
                <div className="border-t pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentUserData?.hasKey || false}
                      onChange={handleKeyToggle}
                      disabled={!connected}
                      className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500 disabled:bg-gray-200"
                    />
                    <span className="text-gray-700">鍵を持っている</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* 院生室 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              院生室
            </h2>
            
            <button
              onClick={() => handleRoomToggle('gradRoom')}
              disabled={!connected}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed ${
                currentUserData?.gradRoom
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {currentUserData?.gradRoom ? (
                <>
                  <LogOut className="w-5 h-5" />
                  退室
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  入室
                </>
              )}
            </button>
          </div>
        </div>

        {/* 現在の状況 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 在室状況 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">現在の在室状況（リアルタイム）</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4 text-yellow-600" />
                  2218室 ({room2218Users.length}人)
                </h4>
                <div className="space-y-1">
                  {room2218Users.length === 0 ? (
                    <p className="text-gray-500 text-sm pl-6">誰もいません</p>
                  ) : (
                    room2218Users.map(user => (
                      <div key={user.id} className="flex items-center gap-2 pl-6">
                        {user.avatar && (
                          <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full" />
                        )}
                        <span className="text-sm text-gray-700">{user.name}</span>
                        {user.hasKey && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            鍵保持
                          </span>
                        )}
                        {user.id === currentUser.id && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            あなた
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  院生室 ({gradRoomUsers.length}人)
                </h4>
                <div className="space-y-1">
                  {gradRoomUsers.length === 0 ? (
                    <p className="text-gray-500 text-sm pl-6">誰もいません</p>
                  ) : (
                    gradRoomUsers.map(user => (
                      <div key={user.id} className="flex items-center gap-2 pl-6">
                        {user.avatar && (
                          <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full" />
                        )}
                        <span className="text-sm text-gray-700">{user.name}</span>
                        {user.id === currentUser.id && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            あなた
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">
                  <strong>鍵の所在:</strong> {keyHolder ? keyHolder.name : '詰所'}
                </p>
              </div>
            </div>
          </div>

          {/* 履歴 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">最近の履歴（共有）</h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">履歴がありません</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="border-l-4 border-blue-200 pl-3 py-2">
                    <p className="text-sm text-gray-700">
                      <strong>{log.userName}</strong> が {log.room} に {log.action}
                      {log.userId === currentUser.id && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                          あなた
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{log.timestamp}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeLabAttendanceSystem;