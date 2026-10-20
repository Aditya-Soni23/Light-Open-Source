import React, { useState } from 'react';
import { AlertCircle, UserPlus } from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo';
import { isValidUsername, sanitizeUsername, signInAsGuest } from '../../services/auth';

export const AuthModal: React.FC<{ isOpen: boolean; onSuccess: () => void }> = ({ isOpen, onSuccess }) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    const handle = sanitizeUsername(username);
    if (!name) return setError('Enter a display name.');
    if (!isValidUsername(handle)) return setError('Username must be 3-20 lowercase letters, numbers, or underscores.');
    setError(''); setLoading(true);
    try { await signInAsGuest(name, handle); onSuccess(); }
    catch (reason: any) { setError(reason?.message || 'Could not enter LIGHT. Please try again.'); }
    finally { setLoading(false); }
  };

  const field = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1c2128] border border-black/10 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500';
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]">
    <form onSubmit={submit} className="w-full max-w-md light-surface light-divider border rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
      <div className="text-center"><BrandLogo size="xl" className="mx-auto mb-3" /><h1 className="text-xl font-semibold">Welcome to LIGHT</h1><p className="text-xs text-slate-500 mt-1">Your friends. Your game. One click away.</p></div>
      {error && <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</p>}
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Display Name<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} placeholder="How friends see you" className={`${field} mt-1.5`} /></label>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Username<input required value={username} onChange={(event) => setUsername(event.target.value)} maxLength={20} placeholder="unique_handle" className={`${field} mt-1.5 font-mono`} /></label>
      <button disabled={loading} className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium disabled:opacity-50 flex justify-center items-center gap-2"><UserPlus className="w-4 h-4" />{loading ? 'Entering...' : 'Enter LIGHT'}</button>
      <p className="text-[11px] text-center text-slate-400">LIGHT uses a guest session. Logging out can make this account inaccessible, but does not delete its data.</p>
    </form>
  </div>;
};
