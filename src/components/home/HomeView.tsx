import React from 'react';
import {
  Radio,
  Users,
  Layers,
  Sparkles,
  Shrink,
  Gamepad2,
  MessageSquare,
  ArrowRight,
  Plus
} from 'lucide-react';
import { UserProfile, GroupConversation, VoiceSessionState } from '../../types';
import { Avatar } from '../common/Avatar';
import { BrandLogo } from '../brand/BrandLogo';

interface HomeViewProps {
  currentUser: UserProfile;
  friends: UserProfile[];
  groups: GroupConversation[];
  voiceState: VoiceSessionState;
  onOpenCreateGroupModal: () => void;
  onSelectFriend: (friend: UserProfile) => void;
  onSelectGroup: (group: GroupConversation) => void;
  onJoinVoice: (channelId: string, title: string) => void;
  onOpenMiniCompanion: () => void;
  onOpenXtremeSmall?: () => void;
  onNavigateToFriends: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  friends,
  groups,
  voiceState,
  onOpenCreateGroupModal,
  onSelectFriend,
  onSelectGroup,
  onJoinVoice,
  onOpenMiniCompanion,
  onOpenXtremeSmall,
  onNavigateToFriends,
}) => {
  const onlineFriends = friends.filter((f) => f.status !== 'offline');

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 light-app-shell transition-colors">
      {/* Calm, refined Welcome Header (Apple/Linear restraint) */}
      <div className="rounded-xl light-surface light-divider border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span>LIGHT Desktop</span>
            <span>·</span>
            <span>Overview</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {currentUser.displayName}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Your friends, squad voice rooms, and lightweight floating in-game overlays are ready.
          </p>
        </div>

        {/* Quick action pill buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenMiniCompanion}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer border border-black/5 dark:border-white/5"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Companion Mode</span>
          </button>

          {onOpenXtremeSmall && (
            <button
              onClick={onOpenXtremeSmall}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer border border-black/5 dark:border-white/5"
            >
              <Shrink className="w-3.5 h-3.5 text-accent" />
              <span>Xtreme Small</span>
            </button>
          )}

          <button
            onClick={onOpenCreateGroupModal}
            className="px-3.5 py-2 rounded-lg light-accent font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Squad</span>
          </button>
        </div>
      </div>

      {/* Grid of Squads and Active Friends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Your Squads & Voice Rooms */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gaming Groups ({groups.length})
            </h3>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 p-8 text-center space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1c2128] border border-black/5 dark:border-white/5 flex items-center justify-center mx-auto text-slate-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  No groups yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Form a squad with your friends to connect to shared persistent voice channels with one click.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map((group) => {
                const memberCount = Object.keys(group.members || {}).length;
                return (
                  <div
                    key={group.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-7 h-7 rounded-lg bg-accent-subtle dark:bg-accent-subtle text-accent dark:text-accent flex items-center justify-center font-semibold text-xs">
                          #
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                        {group.name}
                      </h4>
                      {group.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 mt-3 border-t border-black/5 dark:border-white/5">
                      <button
                        onClick={() => onJoinVoice(group.voiceChannelName, `${group.name} Voice`)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5 text-accent" />
                        <span>Join Voice</span>
                      </button>
                      <button
                        onClick={() => onSelectGroup(group)}
                        className="py-1.5 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Friends Activity Strip */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Online Friends ({onlineFriends.length})
            </h3>
            <button
              onClick={onNavigateToFriends}
              className="text-xs text-accent dark:text-accent hover:underline font-medium cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 p-2.5 space-y-1 shadow-xs">
            {onlineFriends.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                No friends online right now.
              </div>
            ) : (
              onlineFriends.map((friend) => (
                <div
                  key={friend.uid}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1c2128] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      name={friend.displayName}
                      photoURL={friend.photoURL}
                      status={friend.status}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {friend.displayName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {friend.currentGame ? `Playing ${friend.currentGame}` : `@${friend.username}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectFriend(friend)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Direct Message"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
