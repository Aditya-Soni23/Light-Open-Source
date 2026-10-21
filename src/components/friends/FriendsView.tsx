import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  MessageSquare,
  Phone,
  Check,
  X,
  Trash2,
  Gamepad2,
  Search,
  Clock
} from 'lucide-react';
import { UserProfile, FriendRequest } from '../../types';
import { Avatar } from '../common/Avatar';
import { AddFriendModal } from './AddFriendModal';
import {
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend
} from '../../services/friends';

interface FriendsViewProps {
  currentUser: UserProfile;
  friends: UserProfile[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  onStartDirectMessage: (friend: UserProfile) => void;
  onStartVoiceWithFriend?: (friend: UserProfile) => void;
  onToast: (msg: string) => void;
}

type TabType = 'online' | 'all' | 'pending';

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  friends,
  incomingRequests,
  outgoingRequests,
  onStartDirectMessage,
  onStartVoiceWithFriend,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [removingFriendUid, setRemovingFriendUid] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const onlineFriends = friends.filter((f) => f.status !== 'offline');
  const displayedFriends = activeTab === 'online' ? onlineFriends : friends;

  const filteredFriends = displayedFriends.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      f.displayName.toLowerCase().includes(q) ||
      f.username.toLowerCase().includes(q) ||
      (f.currentGame && f.currentGame.toLowerCase().includes(q))
    );
  });

  const handleAcceptRequest = async (req: FriendRequest) => {
    if (processingRequestId) return;
    setProcessingRequestId(req.id);
    try {
      await acceptFriendRequest(req.id, currentUser.uid, req.senderUid);
      onToast(`Accepted friend request from ${req.senderDisplayName}`);
    } catch (e: any) {
      onToast(`Failed to accept: ${e.message}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDeclineRequest = async (req: FriendRequest) => {
    if (processingRequestId) return;
    setProcessingRequestId(req.id);
    try {
      await declineFriendRequest(req.id);
      onToast(`Declined request from ${req.senderDisplayName}`);
    } catch (e: any) {
      onToast(`Failed to decline: ${e.message}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCancelRequest = async (req: FriendRequest) => {
    if (processingRequestId) return;
    setProcessingRequestId(req.id);
    try {
      await cancelFriendRequest(req.id);
      onToast('Friend request cancelled');
    } catch (e: any) {
      onToast(`Failed to cancel: ${e.message}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleConfirmRemove = async (friend: UserProfile) => {
    try {
      await removeFriend(currentUser.uid, friend.uid);
      setRemovingFriendUid(null);
      onToast(`Removed @${friend.username} from friends.`);
    } catch (e: any) {
      onToast(`Failed to remove friend: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full light-app-shell overflow-hidden transition-colors">
      {/* Subheader / Tabs */}
      <div className="h-13 light-surface light-divider border-b px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1c2128] p-1 rounded-xl border border-black/5 dark:border-white/5">
            <button
              onClick={() => setActiveTab('online')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'online'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Online ({onlineFriends.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer relative ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Pending
              {incomingRequests.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-1.5 rounded-lg light-accent font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Friend</span>
        </button>
      </div>

      {/* Main content body */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab !== 'pending' ? (
          <div>
            {/* Search filter */}
            <div className="relative mb-5 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by name, @username, or game..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent transition-colors shadow-xs"
              />
            </div>

            {filteredFriends.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#161b22] border border-black/5 dark:border-white/5 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {searchQuery ? 'No matching friends found' : 'No friends yet'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                  {searchQuery
                    ? 'Try searching with another username or keyword.'
                    : 'Invite friends by their unique @username to connect and jump into voice channels together.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-colors cursor-pointer shadow-xs"
                  >
                    Add Your First Friend
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.uid}
                    className="p-3.5 rounded-xl bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15 transition-all shadow-xs flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={friend.displayName}
                        photoURL={friend.photoURL}
                        status={friend.status}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {friend.displayName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          @{friend.username}
                        </p>
                        {friend.currentGame && (
                          <div className="flex items-center gap-1 text-[10px] text-accent dark:text-accent mt-0.5 truncate">
                            <Gamepad2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{friend.currentGame}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onStartDirectMessage(friend)}
                        title="Send Message"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRemovingFriendUid(friend.uid)}
                        title="Remove Friend"
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* PENDING TAB */
          <div className="space-y-6 max-w-2xl">
            {/* Incoming Requests */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Incoming Requests ({incomingRequests.length})
              </h3>
              {incomingRequests.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No incoming friend requests.</p>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 shadow-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={req.senderDisplayName}
                          photoURL={req.senderPhotoURL}
                          size="md"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {req.senderDisplayName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            @{req.senderUsername}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          disabled={Boolean(processingRequestId)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{processingRequestId === req.id ? 'Working...' : 'Accept'}</span>
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req)}
                          disabled={Boolean(processingRequestId)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="space-y-3 pt-4 border-t border-black/5 dark:border-white/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sent Requests ({outgoingRequests.length})
              </h3>
              {outgoingRequests.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No pending sent requests.</p>
              ) : (
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 shadow-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-white">
                          @{req.receiverUsername}
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Waiting for response</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleCancelRequest(req)}
                        disabled={Boolean(processingRequestId)}
                        className="px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 text-xs transition-colors cursor-pointer"
                      >
                        {processingRequestId === req.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Remove Confirmation Modal */}
      {removingFriendUid && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1c2128] border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Remove Friend?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to remove this connection? You will need to send a new request to reconnect.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemovingFriendUid(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = friends.find((f) => f.uid === removingFriendUid);
                  if (target) handleConfirmRemove(target);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Friend Modal */}
      <AddFriendModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentUser={currentUser}
        onToast={onToast}
      />
    </div>
  );
};
