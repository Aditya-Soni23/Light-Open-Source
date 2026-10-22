import React, { useState, useEffect, useRef } from 'react';
import { Send, Radio, Users, Plus, LogOut, ShieldAlert } from 'lucide-react';
import { UserProfile, GroupConversation, ChatMessage } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  sendGroupMessage,
  subscribeToGroupMessages,
  leaveGroup,
  inviteToGroup
} from '../../services/chat';

interface GroupChatViewProps {
  currentUser: UserProfile;
  group: GroupConversation;
  friends: UserProfile[];
  onJoinVoice: (channelId: string, title: string) => void;
  onLeaveGroupSuccess: () => void;
  onToast: (msg: string) => void;
}

export const GroupChatView: React.FC<GroupChatViewProps> = ({
  currentUser,
  group,
  friends,
  onJoinVoice,
  onLeaveGroupSuccess,
  onToast,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [showInviteDropdown, setShowInviteDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToGroupMessages(group.id, (loaded) => {
      setMessages(loaded);
    });
    return () => unsubscribe();
  }, [group.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setInputText('');
    setSending(true);
    try {
      await sendGroupMessage(group.id, currentUser, text);
    } catch (e: any) {
      onToast(`Failed to send: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm(`Are you sure you want to leave ${group.name}?`)) return;
    try {
      await leaveGroup(group.id, currentUser.uid);
      onToast(`Left group ${group.name}`);
      onLeaveGroupSuccess();
    } catch (e: any) {
      onToast(`Failed to leave group: ${e.message}`);
    }
  };

  const handleInviteFriend = async (friend: UserProfile) => {
    try {
      await inviteToGroup(group.id, friend);
      setShowInviteDropdown(false);
      onToast(`Added @${friend.username} to ${group.name}`);
    } catch (e: any) {
      onToast(e.message || 'Failed to invite friend.');
    }
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const membersList = Object.values(group.members || {});
  const availableFriendsToInvite = friends.filter((f) => !group.memberUids.includes(f.uid));

  return (
    <div className="flex-1 flex h-full light-app-shell overflow-hidden transition-colors">
      {/* Center Chat column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="h-13 light-surface light-divider border-b px-6 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                {group.name}
              </span>
              <span className="text-[11px] text-slate-400">· {membersList.length} members</span>
            </div>
            {group.description && (
              <p className="text-[10px] text-slate-400 truncate max-w-md">{group.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Join Voice Room button */}
            <button
              onClick={() => onJoinVoice(group.voiceChannelName, `${group.name} Voice`)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-accent" />
              <span>Join Voice</span>
            </button>

            {/* Member toggle */}
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showMembers
                  ? 'bg-slate-200 dark:bg-slate-800 border-black/10 dark:border-white/10 text-accent dark:text-accent'
                  : 'bg-white/40 dark:bg-[#161b22]/40 border-black/5 dark:border-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Toggle Member Roster"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* Leave group */}
            <button
              onClick={handleLeaveGroup}
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition-colors"
              title="Leave Group"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-accent-subtle dark:bg-accent-subtle text-accent dark:text-accent flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                Welcome to #{group.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                This is the start of the #{group.name} conversation. Send a message or join the voice room to start gaming together.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderUid === currentUser.uid;
              const prevMsg = messages[index - 1];
              const isSequential = prevMsg && prevMsg.senderUid === msg.senderUid && (msg.timestamp - prevMsg.timestamp < 300000);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 group ${isMe ? 'justify-end' : 'justify-start'} ${
                    isSequential ? 'mt-1' : 'mt-3'
                  }`}
                >
                  {!isMe && !isSequential && (
                    <Avatar
                      name={msg.senderDisplayName}
                      photoURL={msg.senderPhotoURL}
                      size="sm"
                      className="mt-0.5"
                    />
                  )}
                  {!isMe && isSequential && <div className="w-7 shrink-0" />}

                  <div
                    className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-accent text-white font-medium rounded-tr-xs shadow-xs'
                        : 'bg-white dark:bg-[#1c2128] text-slate-900 dark:text-slate-100 rounded-tl-xs border border-black/5 dark:border-white/5 shadow-xs'
                    }`}
                  >
                    {!isMe && !isSequential && (
                      <div className="font-medium text-[11px] text-accent dark:text-accent mb-0.5">
                        {msg.senderDisplayName}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <div
                      className={`text-[9px] font-mono mt-1 text-right select-none ${
                        isMe ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {formatTimestamp(msg.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer */}
        <form
          onSubmit={handleSendMessage}
          className="p-3.5 light-surface light-divider border-t shrink-0"
        >
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#1c2128] border border-black/5 dark:border-white/5 focus-within:border-accent rounded-2xl px-3.5 py-2 transition-colors shadow-xs">
            <input
              type="text"
              placeholder={`Message #${group.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="w-7 h-7 rounded-xl bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>
      </div>

      {/* Right column: Member roster */}
      {showMembers && (
        <aside className="w-56 border-l border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#161b22]/50 p-4 shrink-0 flex flex-col justify-between overflow-hidden">
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Squad Members ({membersList.length})
              </h4>
            </div>

            {/* Add friend to squad dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowInviteDropdown(!showInviteDropdown)}
                className="w-full py-1.5 px-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:border-black/20 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white/60 dark:bg-[#1c2128]/60 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-accent" />
                <span>Add Squad Member</span>
              </button>

              {showInviteDropdown && (
                <div className="absolute top-10 left-0 right-0 p-2 rounded-2xl bg-white dark:bg-[#1c2128] border border-black/10 dark:border-white/10 shadow-xl z-30 space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400 px-2 py-1">
                    Select a Friend
                  </p>
                  {availableFriendsToInvite.length === 0 ? (
                    <p className="text-xs text-slate-400 p-2 text-center">
                      All your friends are already in this squad.
                    </p>
                  ) : (
                    availableFriendsToInvite.map((f) => (
                      <button
                        key={f.uid}
                        onClick={() => handleInviteFriend(f)}
                        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                      >
                        <Avatar name={f.displayName} photoURL={f.photoURL} size="sm" />
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          {f.displayName}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Members list */}
            <div className="space-y-1">
              {membersList.map((m) => (
                <div
                  key={m.uid}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-[#1c2128]/60 transition-colors"
                >
                  <Avatar name={m.displayName} photoURL={m.photoURL} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {m.displayName}
                    </p>
                    <p className="text-[9px] font-mono text-slate-400 truncate">@{m.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
