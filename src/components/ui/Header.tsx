import React from 'react';
import { Clock } from 'lucide-react';
import { CustomIcon } from './CustomIcon';
import { FirebaseAuthUser } from '../../types';
import { APP_CONFIG, MESSAGES, STYLE_CLASSES } from '@/constants';

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
  <div className={`${STYLE_CLASSES.CARD} p-6 mb-6`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center">
          <CustomIcon size="md" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${STYLE_CLASSES.TEXT_PRIMARY}`}>
            {APP_CONFIG.name}
          </h1>
          <div className="flex items-center gap-2">
            {currentUser.avatar && (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-5 h-5 rounded-full"
              />
            )}
            <p className={STYLE_CLASSES.TEXT_SECONDARY}>
              {MESSAGES.STATUS.WELCOME(currentUser.name)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${STYLE_CLASSES.TEXT_SECONDARY}`}>
          <Clock className="w-5 h-5" />
          <span className="font-mono">{currentTime.toLocaleString('ja-JP')}</span>
        </div>
        <button
          onClick={onLogout}
          className={`px-3 py-1 text-sm ${STYLE_CLASSES.TEXT_SECONDARY} hover:text-gray-800 hover:bg-gray-100 rounded transition-colors`}
        >
          {MESSAGES.LOGOUT}
        </button>
      </div>
    </div>
  </div>
);