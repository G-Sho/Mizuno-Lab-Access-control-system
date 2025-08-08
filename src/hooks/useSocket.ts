import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

interface SharedData {
  users: UserData[];
  logs: LogEntry[];
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sharedData, setSharedData] = useState<SharedData>({
    users: [],
    logs: []
  });

  useEffect(() => {
    // Socket.IO接続
    const serverUrl = import.meta.env.DEV 
      ? 'http://localhost:3000'
      : window.location.origin;
      
    socketRef.current = io(serverUrl);

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    // 初期データ受信
    socket.on('initial-data', (data: SharedData) => {
      console.log('Initial data received:', data);
      setSharedData(data);
    });

    // ユーザー更新
    socket.on('users-updated', (users: UserData[]) => {
      console.log('Users updated:', users);
      setSharedData(prev => ({ ...prev, users }));
    });

    // ログ更新
    socket.on('logs-updated', (logs: LogEntry[]) => {
      console.log('Logs updated:', logs);
      setSharedData(prev => ({ ...prev, logs }));
    });

    // データリセット
    socket.on('data-reset', () => {
      console.log('Data reset');
      setSharedData({ users: [], logs: [] });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ユーザー登録
  const registerUser = (userData: UserData) => {
    if (socketRef.current) {
      socketRef.current.emit('user-register', userData);
    }
  };

  // 入退室更新
  const updateRoom = (userId: string, userData: Partial<UserData>, logEntry?: LogEntry) => {
    if (socketRef.current) {
      socketRef.current.emit('room-update', {
        userId,
        userData,
        logEntry
      });
    }
  };

  // 鍵管理更新
  const updateKey = (userId: string, hasKey: boolean, logEntry?: LogEntry) => {
    if (socketRef.current) {
      socketRef.current.emit('key-update', {
        userId,
        hasKey,
        logEntry
      });
    }
  };

  return {
    connected,
    users: sharedData.users,
    logs: sharedData.logs,
    registerUser,
    updateRoom,
    updateKey
  };
};