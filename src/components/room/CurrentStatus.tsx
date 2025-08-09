import React from 'react';
import { Key, Users } from 'lucide-react';
import { FirestoreUser } from '../../types';

interface CurrentStatusProps {
  users: FirestoreUser[];
}

export const CurrentStatus: React.FC<CurrentStatusProps> = ({ users }) => {
  const room2218Users = users.filter(u => u.room2218);
  const gradRoomUsers = users.filter(u => u.gradRoom);
  const keyHolder = users.find(u => u.hasKey);

  const UserList: React.FC<{ users: FirestoreUser[] }> = ({ users }) => (
    <div className="space-y-1">
      {users.length === 0 ? (
        <p className="text-gray-500 text-sm pl-6">誰もいません</p>
      ) : (
        users.map(user => (
          <div key={user.uid} className="flex items-center gap-2 pl-6">
            {user.avatar && (
              <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full" />
            )}
            <span className="text-sm text-gray-700">{user.name}</span>
            {user.hasKey && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                鍵保持
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">現在の在室状況</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Key className="w-4 h-4 text-yellow-600" />
            A2218室 ({room2218Users.length}人)
          </h4>
          <UserList users={room2218Users} />
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            院生室 ({gradRoomUsers.length}人)
          </h4>
          <UserList users={gradRoomUsers} />
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-gray-600">
            <strong>鍵の所在:</strong> {keyHolder ? keyHolder.name : '詰所'}
          </p>
        </div>
      </div>
    </div>
  );
};