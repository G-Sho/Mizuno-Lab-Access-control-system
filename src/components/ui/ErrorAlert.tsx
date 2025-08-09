import React from 'react';

interface ErrorAlertProps {
  message: string;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ 
  message, 
  className = "mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg" 
}) => (
  <div className={className}>
    {message}
  </div>
);