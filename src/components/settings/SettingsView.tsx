import React, { useEffect, useState } from 'react';
import { Check, Gamepad2, Laptop, LogOut, Mic, Moon, Palette, RotateCcw, Save, Sun, User } from 'lucide-react';
import { UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { reserveUsernameAndSaveProfile, sanitizeUsername } from '../../services/auth';
import { updatePresenceStatus } from '../../services/presence';
import { agoraVoice } from '../../services/agora';
import { AccentColor, AppTheme, getPreferences, resetPreferences, savePreferences } from '../../services/preferences';

interface SettingsViewProps {
  currentUser: UserProfile;
  onProfileUpdated: (profile: UserProfile) => void;
  onRequestLogout: () => void;
  onToast: (message: string) => void;
}

type Tab = 'appearance' | 'profile' | 'audio';
const accents: { id: AccentColor; label: string; color: string }[] = [
  { id: 'blue', label: 'Classic Blue', color: '#388bfd' }, { id: 'indigo', label: 'Indigo', color: '#6366f1' },
  { id: 'emerald', label: 'Emerald', color: '#10b981' }, { id: 'amber', label: 'Warm Amber', color: '#f59e0b' },
  { id: 'rose', label: 'Rose', color: '#f43f5e' }, { id: 'neutral', label: 'Monochrome Slate', color: '#94a3b8' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onProfileUpdated, onRequestLogout, onToast }) => {
  const [tab, setTab] = useState<Tab>('appearance');
  const [prefs, setPrefs] = useState(getPreferences());
  const [confirmReset, setConfirmReset] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [currentGame, setCurrentGame] = useState(currentUser.currentGame || '');
  const [saving, setSaving] = useState(false);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [testingMic, setTestingMic] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);

  useEffect(() => {
    agoraVoice.getMicrophones().then((devices) => {
      setMicrophones(devices);
      if (devices[0]) setSelectedMic(devices[0].deviceId);
    }).catch(() => undefined);
  }, []);

  const updatePrefs = (next: typeof prefs) => { setPrefs(next); savePreferences(next); };
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const profile = await reserveUsernameAndSaveProfile(currentUser.uid, sanitizeUsername(username), displayName.trim(), currentUser.email, currentUser.photoURL, currentUser.isGuest);
      await updatePresenceStatus(currentUser.uid, currentUser.status, currentGame.trim() || null);
      onProfileUpdated({ ...profile, currentGame: currentGame.trim() || null }); onToast('Profile updated successfully.');
    } catch (error: any) { onToast(`Error updating profile: ${error.message}`); } finally { setSaving(false); }
  };
  const testMic = async () => {
    if (testingMic) { setTestingMic(false); setInputLevel(0); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = context.createAnalyser(); const source = context.createMediaStreamSource(stream); const processor = context.createScriptProcessor(2048, 1, 1);
      analyser.fftSize = 1024; source.connect(analyser); analyser.connect(processor); processor.connect(context.destination);
      processor.onaudioprocess = () => { const data = new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(data); setInputLevel(Math.min(100, Math.round((data.reduce((sum, value) => sum + value, 0) / data.length) * 2.5))); };
      setTestingMic(true);
    } catch (error: any) { onToast(`Microphone test error: ${error.message}`); }
  };
  const tabs: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [{ id: 'appearance', label: 'Appearance & Theme', icon: Palette }, { id: 'profile', label: 'Profile & Account', icon: User }, { id: 'audio', label: 'Audio & Voice', icon: Mic }];
  const fieldClass = 'mt-1.5 w-full px-3.5 py-2.5 bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500';

  return <div className="flex-1 flex h-full bg-slate-50 dark:bg-[#0d1117] overflow-hidden text-slate-800 dark:text-slate-200 transition-colors">
    <aside className="w-60 border-r border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#161b22]/70 backdrop-blur-md p-4 shrink-0 flex flex-col justify-between">
      <div><div className="px-3 mb-4"><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preferences</h3></div><nav className="space-y-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${tab === id ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}><Icon className={`w-4 h-4 ${id === 'appearance' ? 'text-sky-500' : 'text-slate-500'}`} />{label}</button>)}</nav></div>
      <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/5"><button onClick={() => setConfirmReset(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"><RotateCcw className="w-3.5 h-3.5" />Reset to Defaults</button><button onClick={onRequestLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"><LogOut className="w-3.5 h-3.5" />Log Out</button></div>
    </aside>
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-3xl">
      {tab === 'appearance' && <div className="space-y-8"><div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Appearance & Personalization</h2><p className="text-xs text-slate-500 mt-0.5">Customize LIGHT's interface theme and accent styling.</p></div><section className="space-y-3"><label className="text-xs font-semibold">Interface Theme</label><div className="grid grid-cols-3 gap-3">{([{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }, { id: 'system', label: 'System', icon: Laptop }] as { id: AppTheme; label: string; icon: React.FC<{ className?: string }> }[]).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => updatePrefs({ ...prefs, theme: id })} className={`p-3.5 rounded-2xl border text-left ${prefs.theme === id ? 'border-sky-500 ring-2 ring-sky-500/20 bg-white dark:bg-[#161b22]' : 'border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#161b22]/60'}`}><Icon className="w-4 h-4 text-sky-500 mb-3" /><p className="text-xs font-semibold">{label}</p></button>)}</div></section><section className="space-y-3"><label className="text-xs font-semibold">Accent Color</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{accents.map((accent) => <button key={accent.id} onClick={() => updatePrefs({ ...prefs, accent: accent.id })} className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${prefs.accent === accent.id ? 'border-sky-500 bg-white dark:bg-[#161b22]' : 'border-black/5 dark:border-white/5 bg-white/40 dark:bg-[#161b22]/40'}`}><span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: accent.color }} /><span className="text-xs font-medium">{accent.label}</span>{prefs.accent === accent.id && <Check className="w-3 h-3 text-sky-500 ml-auto" />}</button>)}</div></section></div>}
      {tab === 'profile' && <div className="space-y-6"><div><h2 className="text-base font-semibold text-slate-900 dark:text-white">My Profile</h2><p className="text-xs text-slate-500">Manage your gamer identity, handle, and in-game status.</p></div><div className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 flex items-center justify-between"><div className="flex items-center gap-4"><Avatar name={currentUser.displayName} photoURL={currentUser.photoURL} size="xl" status={currentUser.status} /><div><h3 className="font-semibold text-sm">{currentUser.displayName}</h3><p className="text-xs font-mono text-slate-500">@{currentUser.username}</p></div></div></div><form onSubmit={saveProfile} className="space-y-4"><label className="block text-xs font-medium">Display Name<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} className={fieldClass} /></label><label className="block text-xs font-medium">Unique Username<input required value={username} onChange={(event) => setUsername(event.target.value)} maxLength={20} className={`${fieldClass} font-mono`} /></label><label className="block text-xs font-medium">Current Game Activity<div className="relative"><Gamepad2 className="w-4 h-4 absolute left-3.5 top-4 text-slate-400" /><input value={currentGame} onChange={(event) => setCurrentGame(event.target.value)} maxLength={50} className={`${fieldClass} pl-10`} /></div></label><button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2"><Save className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save Profile Changes'}</button></form></div>}
      {tab === 'audio' && <div className="space-y-6"><div><h2 className="text-base font-semibold text-slate-900 dark:text-white">Audio & Voice Settings</h2><p className="text-xs text-slate-500">Configure input devices and test microphone input levels.</p></div><label className="block text-xs font-medium">Input Microphone Device<select value={selectedMic} onChange={(event) => setSelectedMic(event.target.value)} className={fieldClass}>{microphones.map((mic) => <option key={mic.deviceId} value={mic.deviceId}>{mic.label || `Microphone ${mic.deviceId.slice(0, 5)}`}</option>)}</select></label><div className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 space-y-3"><div className="flex items-center justify-between"><div><h4 className="text-xs font-semibold">Microphone Test</h4><p className="text-[11px] text-slate-500">Speak into your microphone to verify detection level.</p></div><button type="button" onClick={testMic} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${testingMic ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>{testingMic ? 'Stop Test' : 'Test Mic'}</button></div>{testingMic && <div><div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full" style={{ width: `${inputLevel}%` }} /></div><p className="text-[10px] font-mono text-slate-400 mt-1">Input Level {inputLevel}%</p></div>}</div></div>}
    </div>
    {confirmReset && <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"><div className="bg-white dark:bg-[#1c2128] border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"><h3 className="text-sm font-semibold">Reset Preferences?</h3><p className="text-xs text-slate-600 dark:text-slate-400">This restores LIGHT's standard appearance and interface defaults.</p><div className="flex justify-end gap-2"><button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 text-xs">Cancel</button><button onClick={() => { setPrefs(resetPreferences()); setConfirmReset(false); onToast('Settings reset to standard defaults.'); }} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white">Reset Defaults</button></div></div></div>}
  </div>;
};
