import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, X } from 'lucide-react';
import { auth } from '../../services/firebase';
import { linkGuestToGoogle } from '../../services/auth';
import { UserProfile } from '../../types';

interface GuestUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgraded: (updatedProfile: UserProfile) => void;
}

export const GuestUpgradeModal: React.FC<GuestUpgradeModalProps> = ({
  isOpen,
  onClose,
  onUpgraded,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await linkGuestToGoogle(auth.currentUser);
      onUpgraded(updated);
      onClose();
    } catch (err: any) {
      console.error('[GuestUpgrade] Upgrade error:', err);
      if (err.code === 'auth/credential-already-in-use') {
        setError('This Google account is already linked to another LIGHT profile. Please use a different Google account.');
      } else {
        setError(err.message || 'Failed to link Google account.');
      }
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
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Protect Your Account</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upgrade your guest profile to permanent Google login
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
          Linking your Google account preserves your unique username, current friends, conversations, and squad voice rooms across any device or browser session.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {loading ? 'Linking Google Account...' : 'Link Google Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
