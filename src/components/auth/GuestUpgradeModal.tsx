import React from 'react';
import { ShieldCheck, AlertCircle, X } from 'lucide-react';
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
  if (!isOpen) return null;

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
              Google account linking
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
          Google account linking is temporarily unavailable while we prepare a reliable desktop sign-in experience. Your guest profile, friends, conversations, and voice rooms remain available here.
        </p>

        <div className="mb-4 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 flex items-start gap-2 text-xs text-sky-700 dark:text-sky-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-500" />
          <span>Google sign-in is temporarily unavailable. We're working on bringing it back soon.</span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button type="button" disabled className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium text-xs rounded-xl cursor-not-allowed shadow-xs">
            Google Linking — Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
};
