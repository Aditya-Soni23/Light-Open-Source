import React, { useState } from 'react';
import { UserPresenceStatus } from '../../types';

interface AvatarProps {
  name: string;
  photoURL?: string | null;
  status?: UserPresenceStatus;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isSpeaking?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  photoURL,
  status,
  size = 'md',
  isSpeaking = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }[size];

  const statusIndicatorSizes = {
    sm: 'w-2 h-2 -bottom-0.5 -right-0.5 ring-1',
    md: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 ring-2',
    lg: 'w-3.5 h-3.5 bottom-0 right-0 ring-2',
    xl: 'w-4 h-4 bottom-0.5 right-0.5 ring-2',
  }[size];

  const statusColors = {
    online: 'bg-emerald-500',
    'in-game': 'bg-sky-400',
    idle: 'bg-amber-500',
    dnd: 'bg-rose-500',
    offline: 'bg-slate-500',
  };

  const getInitials = (text: string) => {
    if (!text) return 'L';
    const parts = text.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full transition-all duration-150 ${sizeClasses} ${
        isSpeaking ? 'ring-2 ring-[var(--accent-border)]' : ''
      } ${className}`}
    >
      {photoURL && !imgError ? (
        <img
          src={photoURL}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center font-medium text-slate-300">
          {getInitials(name)}
        </div>
      )}

      {status && (
        <span
          className={`absolute rounded-full ring-slate-950 ${statusColors[status] || 'bg-slate-500'} ${statusIndicatorSizes}`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};
