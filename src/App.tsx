import React, { useEffect } from 'react';
import {
  LoadingSpinner,
  ErrorAlert,
  LoginScreen,
  Header,
  RoomCard,
  CurrentStatus,
  ActivityHistory
} from './components';
import {
  useAuth,
  useFirestore,
  useAttendance,
  useCurrentTime
} from './hooks';

const App: React.FC = () => {
  const {
    currentUser,
    authLoading,
    authError,
    handleSlackLogin,
    handleLogout
  } = useAuth();

  const { users, logs } = useFirestore(currentUser);
  const currentTime = useCurrentTime();
  
  const {
    loading,
    error,
    handleRoomToggle,
    handleKeyToggle
  } = useAttendance(currentUser, users);

  if (authLoading) {
    return <LoadingSpinner message="認証処理中..." />;
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onSlackLogin={handleSlackLogin}
        authLoading={authLoading}
        authError={authError}
      />
    );
  }

  const currentUserData = users.find(u => u.uid === currentUser.uid);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Header
          currentUser={currentUser}
          currentTime={currentTime}
          onLogout={handleLogout}
        />

        {(authError || error) && (
          <ErrorAlert message={authError || error || ''} />
        )}

        {/* 操作パネル */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <RoomCard
            roomType="room2218"
            currentUserData={currentUserData}
            onRoomToggle={handleRoomToggle}
            onKeyToggle={handleKeyToggle}
            loading={loading}
          />

          <RoomCard
            roomType="gradRoom"
            currentUserData={currentUserData}
            onRoomToggle={handleRoomToggle}
            loading={loading}
          />
        </div>

        {/* 現在の状況 */}
        <div className="grid md:grid-cols-2 gap-6">
          <CurrentStatus users={users} />
          <ActivityHistory logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default App;