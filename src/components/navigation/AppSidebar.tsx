import React from 'react';
import {
  Users,
  MessageSquare,
  Radio,
  Settings,
  Compass,
  LogOut,
  Sparkles,
  Layers,
  Shrink
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { UserProfile } from '../../types';

export type MainNavSection = 'home' | 'friends' | 'messages' | 'groups' | 'voice' | 'settings';

interface AppSidebarProps {
  currentSection: MainNavSection;
  onSelectSection: (section: MainNavSection) => void;
  userProfile: UserProfile | null;
  pendingRequestsCount: number;
  unreadMessagesCount: number;
  isInVoice: boolean;
  onOpenMiniCompanion: () => void;
  onOpenXtremeSmall?: () => void;
  onRequestLogout: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentSection,
  onSelectSection,
  userProfile,
  pendingRequestsCount,
  unreadMessagesCount,
  isInVoice,
  onOpenMiniCompanion,
  onOpenXtremeSmall,
  onRequestLogout,
}) => {
  const navItems: { id: MainNavSection; label: string; icon: React.FC<any>; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: Compass },
    { id: 'friends', label: 'Friends', icon: Users, badge: pendingRequestsCount },
    { id: 'messages', label: 'Direct Messages', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'groups', label: 'Groups', icon: Layers },
    { id: 'voice', label: 'Voice Rooms', icon: Radio },
    { id: 'settings', label: 'Preferences', icon: Settings },
  ];

  return (
    <aside className="w-14 light-surface light-divider border-r flex flex-col items-center py-3 select-none shrink-0 z-20 transition-colors">
      {/* Navigation item rail */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              title={item.label}
              className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-medium'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* Active left indicator notch */}
              {isActive && (
                <span className="absolute -left-2.5 top-2.5 bottom-2.5 w-0.5 bg-[var(--accent-primary)] rounded-r" />
              )}
              <Icon className="w-4 h-4" />

              {/* Badge count */}
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center font-mono">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* Separator */}
        <div className="w-6 border-t border-black/5 dark:border-white/5 my-2" />

        {/* Floating Companion Launcher */}
        <button
          onClick={onOpenMiniCompanion}
          title="Open Companion Mode (Ctrl+Shift+M)"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-sky-500" />
        </button>

        {/* Xtreme Small Launcher */}
        {onOpenXtremeSmall && (
          <button
            onClick={onOpenXtremeSmall}
            title="Collapse to Xtreme Small (Logo only)"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Shrink className="w-4 h-4 text-sky-500" />
          </button>
        )}
      </nav>

      {/* User avatar & sign out */}
      <div className="flex flex-col items-center gap-2.5 pt-2">
        {userProfile && (
          <button
            onClick={() => onSelectSection('settings')}
            title={`Logged in as ${userProfile.displayName} (@${userProfile.username})`}
            className="cursor-pointer transition-transform hover:scale-105"
          >
            <Avatar
              name={userProfile.displayName}
              photoURL={userProfile.photoURL}
              status={userProfile.status}
              size="sm"
            />
          </button>
        )}

        <button
          onClick={onRequestLogout}
          title="Sign Out"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
