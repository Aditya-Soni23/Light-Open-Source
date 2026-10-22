import React, { useState } from 'react';
import { UserPlus, Search, Check, AlertCircle, X } from 'lucide-react';
import { UserProfile } from '../../types';
import { sendFriendRequestByUsername } from '../../services/friends';
import { sanitizeUsername } from '../../services/auth';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onToast: (msg: string) => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onToast,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeUsername(usernameInput);
    if (!clean) {
      setError('Please enter a username.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await sendFriendRequestByUsername(currentUser, clean);
      onToast(res.message);
      setUsernameInput('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send friend request.');
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
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Add Friend</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Invite a player by their exact LIGHT username
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Player Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs font-mono">@</span>
              <input
                type="text"
                autoFocus
                required
                placeholder="exact_username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-100 dark:bg-[#1c2128] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent font-mono transition-colors shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Your own username is <span className="text-accent dark:text-accent font-mono">@{currentUser.username}</span>. Share it with friends to connect.
            </p>
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
              disabled={loading || !usernameInput.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{loading ? 'Sending...' : 'Send Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
