import React, { useMemo } from 'react';
import { useActiveCursors } from '@/stores/collaborationStore';

interface UserCursorsProps {
  view: 'daw' | 'theory';
  scale: number; // React Flow viewport scale
  transform: [number, number, number]; // React Flow viewport transform
}

interface UserCursorProps {
  userId: string;
  x: number;
  y: number;
  userName: string;
  userColor: string;
  status: 'active' | 'idle' | 'away';
  transform: [number, number, number];
  scale: number;
}

const UserCursor: React.FC<UserCursorProps> = ({
  x,
  y,
  userName,
  userColor,
  status,
  transform,
  scale,
}) => {
  const position = useMemo(() => {
    // Apply React Flow transform to convert flow coordinates to screen coordinates
    // transform is [x, y, zoom] format for React Flow
    const screenX = x * transform[2] + transform[0];
    const screenY = y * transform[2] + transform[1];
    return { x: screenX, y: screenY };
  }, [x, y, transform]);

  const isIdle = status === 'idle' || status === 'away';

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Cursor */}
      <svg
        width={20 * scale}
        height={20 * scale}
        viewBox="0 0 20 20"
        className={`transition-opacity ${isIdle ? 'opacity-50' : 'opacity-100'}`}
      >
        <path
          d="M0 0 L5 3 L3 5 L7 7 L10 10 L8 8 L6 12 L10 16 L14 12 L18 8 L20 10 L14 16 L12 18 L8 14 L4 18 L2 16 L6 12 L8 8 L10 6 L8 4 L10 2 L0 0"
          fill={userColor}
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* User name */}
      <div
        className={`px-2 py-1 text-xs text-white rounded-md shadow-lg transition-opacity ${
          isIdle ? 'opacity-50' : 'opacity-100'
        }`}
        style={{
          backgroundColor: userColor,
          marginTop: 4,
          transform: `translateX(-50%)`,
        }}
      >
        {userName}
      </div>
    </div>
  );
};

export function UserCursors({ view, scale, transform }: UserCursorsProps) {
  const activeCursors = useActiveCursors();

  const filteredCursors = useMemo(() => {
    return (activeCursors as any[]).filter((cursor: any) =>
      cursor.view === view &&
      cursor.user &&
      cursor.user.status !== 'away'
    );
  }, [activeCursors, view]);

  if (filteredCursors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {filteredCursors.map(cursor => (
        <UserCursor
          key={cursor.userId}
          userId={cursor.userId}
          x={cursor.x}
          y={cursor.y}
          userName={cursor.user?.name || 'Unknown'}
          userColor={cursor.user?.color || '#6b7280'}
          status={cursor.user?.status || 'active'}
          transform={transform}
          scale={scale}
        />
      ))}
    </div>
  );
}