import React, { useState } from 'react';
import { Layers, Plus, Check, X, AlertCircle } from 'lucide-react';
import { UserProfile, GroupConversation } from '../../types';
import { Avatar } from '../common/Avatar';
import { createGroup } from '../../services/chat';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  friends: UserProfile[];
  onGroupCreated: (group: GroupConversation) => void;
  onToast: (msg: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  friends,
  onGroupCreated,
  onToast,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFriendUids, setSelectedFriendUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleFriend = (uid: string) => {
    const next = new Set(selectedFriendUids);
    if (next.has(uid)) {
      next.delete(uid);
    } else {
      next.add(uid);
    }
    setSelectedFriendUids(next);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please provide a group name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedFriends = friends.filter((f) => selectedFriendUids.has(f.uid));
      const group = await createGroup(currentUser, trimmed, description, selectedFriends);
      onToast(`Created squad "${group.name}"`);
      onGroupCreated(group);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create squad.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl relative text-slate-800 dark:text-slate-100 transition-colors">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-subtle dark:bg-accent-subtle text-accent dark:text-accent flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Create Squad</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Start a persistent squad voice and chat channel
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Squad Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Squad / Night Shift"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#1c2128] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent transition-colors shadow-xs"
              maxLength={40}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Squad voice channel for gaming sessions"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#1c2128] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent transition-colors shadow-xs"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Invite Friends ({selectedFriendUids.size} selected)
            </label>
            {friends.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                No friends added yet. You can still create the squad and invite them later!
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-100 dark:bg-[#1c2128] p-2 rounded-xl border border-black/5 dark:border-white/5">
                {friends.map((friend) => {
                  const isSelected = selectedFriendUids.has(friend.uid);
                  return (
                    <button
                      key={friend.uid}
                      type="button"
                      onClick={() => toggleFriend(friend.uid)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 shadow-xs'
                          : 'hover:bg-white/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
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
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            @{friend.username}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                          isSelected
                            ? 'bg-accent text-white font-bold'
                            : 'border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{loading ? 'Creating...' : 'Create Squad'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
