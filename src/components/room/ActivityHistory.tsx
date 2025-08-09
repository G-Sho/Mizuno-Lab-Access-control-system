import React from 'react';
import { FirestoreLogEntry } from '../../types';

interface ActivityHistoryProps {
  logs: FirestoreLogEntry[];
}

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({ logs }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h3 className="text-lg font-bold text-gray-800 mb-4">最近の履歴</h3>
    
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {logs.length === 0 ? (
        <p className="text-gray-500 text-sm">履歴がありません</p>
      ) : (
        logs.map(log => (
          <div key={log.id} className="border-l-4 border-blue-200 pl-3 py-2">
            <p className="text-sm text-gray-700">
              <strong>{log.userName}</strong> が {log.room} に {log.action}
            </p>
            <p className="text-xs text-gray-500">
              {log.timestamp?.toDate?.()?.toLocaleString('ja-JP') || '時刻不明'}
            </p>
          </div>
        ))
      )}
    </div>
  </div>
);