import React from 'react';
import { Key, Users, LogIn, LogOut } from 'lucide-react';
import { RoomType, FirestoreUser } from '../../types';

interface RoomCardProps {
  roomType: RoomType;
  currentUserData: FirestoreUser | undefined;
  onRoomToggle: (roomType: RoomType) => void;
  onKeyToggle?: () => void;
  loading: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  roomType,
  currentUserData,
  onRoomToggle,
  onKeyToggle,
  loading
}) => {
  const isRoom2218 = roomType === 'room2218';
  const isInRoom = currentUserData?.[roomType];
  const roomName = isRoom2218 ? 'A2218室' : '院生室';
  const IconComponent = isRoom2218 ? Key : Users;
  const iconColor = isRoom2218 ? 'text-yellow-600' : 'text-blue-600';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <IconComponent className={`w-6 h-6 ${iconColor}`} />
        {roomName}
      </h2>
      
      <div className="space-y-4">
        <button
          onClick={() => onRoomToggle(roomType)}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            isInRoom
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          } disabled:opacity-50`}
        >
          {isInRoom ? (
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

        {isRoom2218 && isInRoom && onKeyToggle && (
          <div className="border-t pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={currentUserData?.hasKey || false}
                onChange={onKeyToggle}
                disabled={loading}
                className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
              />
              <span className="text-gray-700">鍵を持っている</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};