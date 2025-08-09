import React from 'react';
import { Clock, Users } from 'lucide-react';
import { FirebaseAuthUser } from '../../types';

interface HeaderProps {
  currentUser: FirebaseAuthUser;
  currentTime: Date;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  currentTime, 
  onLogout 
}) => (
  <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">入退室管理</h1>
          <div className="flex items-center gap-2">
            {currentUser.avatar && (
              <img src={currentUser.avatar} alt={currentUser.name} className="w-5 h-5 rounded-full" />
            )}
            <p className="text-gray-600">ようこそ、{currentUser.name}さん</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-5 h-5" />
          <span className="font-mono">{currentTime.toLocaleString('ja-JP')}</span>
        </div>
        <button
          onClick={onLogout}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
        >
          ログアウト
        </button>
      </div>
    </div>
  </div>
);