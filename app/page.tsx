'use client';

import React from 'react';
import {
  LoadingSpinner,
  ErrorAlert,
  LoginScreen,
  Header,
  RoomCard,
  CurrentStatus,
  ActivityHistory
} from '@/components';
import {
  useAuth,
  useFirestore,
  useAttendance,
  useCurrentTime
} from '@/hooks';
import { MESSAGES, STYLE_CLASSES, ROOM_TYPES } from '@/constants';

export default function Home() {
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
    return <LoadingSpinner message={MESSAGES.AUTH.LOADING} />;
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
    <div className={`${STYLE_CLASSES.GRADIENT_BG} p-4`}>
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
            roomType={ROOM_TYPES.ROOM_2218}
            currentUserData={currentUserData}
            onRoomToggle={handleRoomToggle}
            onKeyToggle={handleKeyToggle}
            loading={loading}
          />

          <RoomCard
            roomType={ROOM_TYPES.GRAD_ROOM}
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
}