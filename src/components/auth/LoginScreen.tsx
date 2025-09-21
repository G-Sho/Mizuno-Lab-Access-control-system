import React from 'react';
import { ErrorAlert } from '../ui/ErrorAlert';
import { CustomIcon } from '../ui/CustomIcon';
import { APP_CONFIG, MESSAGES, STYLE_CLASSES } from '@/constants';

interface LoginScreenProps {
  onSlackLogin: () => void;
  authLoading: boolean;
  authError: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSlackLogin,
  authLoading,
  authError
}) => (
  <div className={`${STYLE_CLASSES.GRADIENT_BG} flex items-center justify-center p-4`}>
    <div className={`${STYLE_CLASSES.CARD} p-8 max-w-md w-full`}>
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
          <CustomIcon size="lg" />
        </div>
        <h1 className={`text-2xl font-bold ${STYLE_CLASSES.TEXT_PRIMARY} mb-2`}>
          {APP_CONFIG.name}
        </h1>
        <p className={`text-sm ${STYLE_CLASSES.TEXT_ACCENT} font-medium`}>
          {APP_CONFIG.description}
        </p>
      </div>
      
      {authError && <ErrorAlert message={authError} className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" />}

      <button
        onClick={onSlackLogin}
        disabled={authLoading}
        className={`w-full ${STYLE_CLASSES.BUTTON_PRIMARY} py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
        </svg>
        {MESSAGES.AUTH.LOGIN_BUTTON}
      </button>
      
    </div>
  </div>
);