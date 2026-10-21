import React from 'react';
import {
  Users,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Sparkles,
  Gamepad2,
  Layers,
  Compass
} from 'lucide-react';
import {
  UserProfile,
  DirectConversation,
  GroupConversation
} from '../../types';
import { Avatar } from '../common/Avatar';
import { MainNavSection } from './AppSidebar';

interface SubSidebarProps {
  currentSection: MainNavSection;
  friends: UserProfile[];
  directConversations: DirectConversation[];
  groups: GroupConversation[];
  activeRecipient: UserProfile | null;
  activeGroup: GroupConversation | null;
  onSelectFriend: (friend: UserProfile) => void;
  onSelectGroup: (group: GroupConversation) => void;
  onOpenCreateGroupModal: () => void;
  onSelectSection: (section: MainNavSection) => void;
}

export const SubSidebar: React.FC<SubSidebarProps> = ({
  currentSection,
  friends,
  directConversations,
  groups,
  activeRecipient,
  activeGroup,
  onSelectFriend,
  onSelectGroup,
  onOpenCreateGroupModal,
  onSelectSection,
}) => {
  const onlineFriends = friends.filter((f) => f.status !== 'offline');

  return (
    <aside className="w-60 light-subtle light-divider border-r flex flex-col shrink-0 select-none overflow-hidden transition-colors">
      {/* Header based on section */}
      <div className="h-11 px-3.5 light-divider border-b flex items-center justify-between shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {currentSection === 'home' && 'Activity & Squads'}
          {currentSection === 'friends' && 'Connections'}
          {currentSection === 'messages' && 'Direct Messages'}
          {currentSection === 'groups' && 'Gaming Groups'}
          {currentSection === 'voice' && 'Voice Channels'}
          {currentSection === 'settings' && 'Settings'}
        </span>

        {currentSection === 'groups' && (
          <button
            onClick={onOpenCreateGroupModal}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            title="Create New Group"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* HOME SECTION OVERVIEW */}
        {currentSection === 'home' && (
          <div className="space-y-4 pt-1">
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Online Friends ({onlineFriends.length})
              </div>
              {onlineFriends.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-slate-400 dark:text-slate-500">
                  No friends online right now
                </p>
              ) : (
                onlineFriends.slice(0, 6).map((friend) => (
                  <button
                    key={friend.uid}
                    onClick={() => {
                      onSelectFriend(friend);
                      onSelectSection('messages');
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-white dark:hover:bg-[#1c2128] text-slate-700 dark:text-slate-300 transition-colors group cursor-pointer"
                  >
                    <Avatar
                      name={friend.displayName}
                      photoURL={friend.photoURL}
                      status={friend.status}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-accent-hover dark:group-hover:text-accent transition-colors truncate">
                        {friend.displayName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {friend.currentGame ? `Playing ${friend.currentGame}` : `@${friend.username}`}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div>
              <div className="px-2 py-1 flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                <span>Groups ({groups.length})</span>
                <button
                  onClick={onOpenCreateGroupModal}
                  className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  + NEW
                </button>
              </div>
              {groups.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-slate-400 dark:text-slate-500">
                  No groups joined yet
                </p>
              ) : (
                groups.slice(0, 5).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      onSelectGroup(g);
                      onSelectSection('groups');
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-white dark:hover:bg-[#1c2128] text-slate-700 dark:text-slate-300 transition-colors group cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-accent-subtle dark:bg-accent-subtle text-accent dark:text-accent flex items-center justify-center shrink-0 text-xs font-semibold">
                      #
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-accent-hover dark:group-hover:text-accent transition-colors truncate">
                        {g.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {Object.keys(g.members || {}).length} members
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* FRIENDS SECTION */}
        {currentSection === 'friends' && (
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              All Connections ({friends.length})
            </div>
            {friends.map((friend) => (
              <button
                key={friend.uid}
                onClick={() => onSelectFriend(friend)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                  activeRecipient?.uid === friend.uid
                    ? 'bg-white dark:bg-[#1c2128] shadow-xs text-slate-900 dark:text-white font-medium border border-black/5 dark:border-white/5'
                    : 'hover:bg-white/60 dark:hover:bg-[#1c2128]/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Avatar
                  name={friend.displayName}
                  photoURL={friend.photoURL}
                  status={friend.status}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{friend.displayName}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">@{friend.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* DIRECT MESSAGES SECTION */}
        {currentSection === 'messages' && (
          <div className="space-y-1">
            {friends.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 p-4 text-center">
                Add friends to start direct messaging.
              </p>
            ) : (
              friends.map((friend) => {
                const isActive = activeRecipient?.uid === friend.uid;
                return (
                  <button
                    key={friend.uid}
                    onClick={() => onSelectFriend(friend)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#1c2128] shadow-xs font-medium border border-black/5 dark:border-white/5'
                        : 'hover:bg-white/60 dark:hover:bg-[#1c2128]/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Avatar
                      name={friend.displayName}
                      photoURL={friend.photoURL}
                      status={friend.status}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs truncate ${isActive ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-800 dark:text-slate-200'}`}>
                        {friend.displayName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        @{friend.username}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* GROUPS SECTION */}
        {(currentSection === 'groups' || currentSection === 'voice') && (
          <div className="space-y-1">
            {groups.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">No groups created yet.</p>
                <button
                  onClick={onOpenCreateGroupModal}
                  className="px-3 py-1.5 rounded-lg bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-colors shadow-xs"
                >
                  Create Squad
                </button>
              </div>
            ) : (
              groups.map((group) => {
                const isActive = activeGroup?.id === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => onSelectGroup(group)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#1c2128] shadow-xs border border-black/5 dark:border-white/5'
                        : 'hover:bg-white/60 dark:hover:bg-[#1c2128]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-xs shrink-0 ${
                          isActive
                            ? 'bg-accent text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        #
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs truncate ${isActive ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                          {group.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {Object.keys(group.members || {}).length} members
                        </p>
                      </div>
                    </div>

                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-accent">
                      <Radio className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
