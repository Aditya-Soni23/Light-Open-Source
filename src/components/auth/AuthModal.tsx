import React, { useRef, useState } from 'react';
import { UserPlus, AlertCircle, Check, MessageSquare, Radio, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo';
import { AuthDiagnosticsPanel } from './AuthDiagnosticsPanel';
import {
  signInAsGuest,
  isUsernameAvailable,
  isValidUsername,
  sanitizeUsername,
} from '../../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const [tab, setTab] = useState<'options' | 'guest-form'>('options');
  const [guestName, setGuestName] = useState('');
  const [guestUsername, setGuestUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ title: string; link?: string; linkText?: string; actionText?: string } | null>(null);
  const usernameCheckId = useRef(0);

  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setLoading(true);
    setError(null);
    setErrorDetails(null);

    const cleanUsername = sanitizeUsername(guestUsername.trim() || guestName.trim());
    if (!isValidUsername(cleanUsername)) {
      setError('Your username must be 3-20 characters using lowercase letters, numbers, and underscores.');
      return;
    }
    if (usernameAvailable === false) {
      setError('That username is already taken. Please choose another.');
      return;
    }
    setLoading(true);
    try {
      await signInAsGuest(guestName.trim(), cleanUsername);
      onSuccess();
    } catch (err: any) {
      console.warn('[AuthModal] Guest sign in warning:', err);
      const msg = err.message || '';
      if (err.code === 'auth/admin-restricted-operation' || msg.includes('admin-restricted-operation')) {
        setError('Anonymous Authentication is disabled in Firebase Console.');
        setErrorDetails({
          title: 'Firebase Anonymous Auth Disabled',
          link: 'https://console.firebase.google.com/project/light-3dc69/authentication/providers',
          linkText: 'Enable Anonymous Provider in Firebase Console',
        });
        return;
      }

      if (msg.includes('PERMISSION_DENIED') || msg.includes('permission_denied')) {
        setError('Your guest profile could not be created. Please verify your Firebase Realtime Database rules and try again.');
        return;
      }

      setError(err.message || 'Failed to initialize guest profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUsername = async (val: string) => {
    setGuestUsername(val);
    setUsernameAvailable(null);
    const checkId = ++usernameCheckId.current;
    const clean = sanitizeUsername(val);
    if (clean.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const avail = await isUsernameAvailable(clean);
      if (checkId === usernameCheckId.current) setUsernameAvailable(avail);
    } catch (e) {
      if (checkId === usernameCheckId.current) setUsernameAvailable(true);
    } finally {
      if (checkId === usernameCheckId.current) setCheckingUsername(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)] select-none">
      <div className="w-full max-w-md light-surface light-divider border rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden text-slate-800 dark:text-slate-100 transition-colors">
        <div className="relative">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-7">
            <BrandLogo size="xl" className="mb-3" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
              DIAMOND presents
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              The calm place between matches.
            </h1>
            <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400 mt-2">
              Keep your squad close, your voice clear, and your next game one click away.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 w-full text-[10px] text-slate-500 dark:text-slate-400">
              <div className="light-subtle rounded-lg px-2 py-2 flex flex-col items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />Messages</div>
              <div className="light-subtle rounded-lg px-2 py-2 flex flex-col items-center gap-1"><Radio className="w-3.5 h-3.5 text-[var(--accent-primary)]" />Voice</div>
              <div className="light-subtle rounded-lg px-2 py-2 flex flex-col items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" />Private</div>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>

              {errorDetails && (
                <div className="p-3 bg-white dark:bg-[#12151b] rounded-xl border border-black/5 dark:border-white/5 space-y-2 mt-2">
                  <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    {errorDetails.title}
                  </div>
                  {errorDetails.link && (
                    <a
                      href={errorDetails.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 hover:underline font-medium text-[11px]"
                    >
                      <span>{errorDetails.linkText || 'Open in Firebase Console'}</span>
                    </a>
                  )}

                </div>
              )}

              {unauthorizedDomain && (
                <div className="p-3 bg-white dark:bg-[#12151b] rounded-xl border border-black/5 dark:border-white/5 space-y-2 mt-2">
                  <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    Authorized Domain to Add:
                  </div>
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-[#1c2128] p-2 rounded-lg font-mono text-xs">
                    <span className="truncate select-all text-slate-800 dark:text-slate-200">
                      {unauthorizedDomain}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(unauthorizedDomain);
                      }}
                      className="px-2 py-0.5 bg-sky-500 text-white font-sans font-medium text-[10px] rounded transition-colors shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'options' ? (
            <div className="space-y-3">
              {/* Google Sign-in */}
              <button
                type="button"
                disabled
                aria-describedby="google-signin-unavailable"
                className="w-full py-2.5 px-4 bg-slate-100/80 dark:bg-[#1a1f27] border border-black/5 dark:border-white/5 rounded-xl text-slate-400 dark:text-slate-500 font-medium text-xs flex items-center justify-center gap-3 shadow-xs cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google Sign-In — Coming Soon</span>
              </button>
              <p id="google-signin-unavailable" className="px-2 text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Google sign-in is temporarily unavailable. We're working on bringing it back soon.
              </p>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-black/5 dark:border-white/5" />
                <span className="shrink mx-3 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  or
                </span>
                <div className="flex-grow border-t border-black/5 dark:border-white/5" />
              </div>

              {/* Guest Login */}
              <button
                type="button"
                onClick={() => setTab('guest-form')}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Continue as Guest</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center pt-2">
                Guest accounts are ready to use now. Google account linking will return soon.
              </p>
              <AuthDiagnosticsPanel />
            </div>
          ) : (
            /* GUEST FORM */
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GhostRider, Alex, PixelHero"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-[#1c2128] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-xs"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Unique Username (Handle)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    placeholder="unique_tag"
                    value={guestUsername}
                    onChange={(e) => handleCheckUsername(e.target.value)}
                    className="w-full pl-8 pr-10 py-2.5 bg-slate-100 dark:bg-[#1c2128] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-xs"
                    maxLength={20}
                  />
                  <div className="absolute right-3.5 top-2.5 text-xs">
                    {checkingUsername && <span className="text-slate-400 font-mono text-[10px]">Checking...</span>}
                    {usernameAvailable === true && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTab('options')}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !guestName.trim()}
                  className="flex-1 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  {loading ? 'Creating...' : 'Enter LIGHT'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
