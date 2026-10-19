import React, { useState, useEffect } from 'react';
import {
  User,
  Palette,
  Mic,
  Monitor,
  KeyRound,
  Gamepad2,
  Check,
  Shield,
  RotateCcw,
  Sparkles,
  Shrink,
  Sliders,
  Sun,
  Moon,
  Laptop,
  Maximize2,
  LogOut,
  Save,
  Info
} from 'lucide-react';
import { UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { BrandLogo } from '../brand/BrandLogo';
import { reserveUsernameAndSaveProfile, sanitizeUsername, signOut } from '../../services/auth';
import { updatePresenceStatus } from '../../services/presence';
import { agoraVoice } from '../../services/agora';
import { desktop } from '../../services/desktop';
import {
  getPreferences,
  savePreferences,
  resetPreferences,
  AppTheme,
  AccentColor,
  InterfaceDensity,
  MotionPreference,
  XtremeSmallShape,
  XtremeSmallHover,
  XtremeSmallClickAction
} from '../../services/preferences';

interface SettingsViewProps {
  currentUser: UserProfile;
  onProfileUpdated: (profile: UserProfile) => void;
  onOpenUpgradeModal: () => void;
  onShowAgoraModal: () => void;
  onToast: (msg: string) => void;
  onOpenCompanionMode?: () => void;
  onOpenXtremeSmall?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onProfileUpdated,
  onOpenUpgradeModal,
  onShowAgoraModal,
  onToast,
  onOpenCompanionMode,
  onOpenXtremeSmall,
}) => {
  const [activeTab, setActiveTab] = useState<
    'appearance' | 'modes' | 'profile' | 'audio' | 'desktop' | 'agora'
  >('appearance');

  // Preferences State
  const [prefs, setPrefs] = useState(getPreferences());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Profile Form State
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [currentGame, setCurrentGame] = useState(currentUser.currentGame || '');
  const [status, setStatus] = useState(currentUser.status);
  const [savingProfile, setSavingProfile] = useState(false);

  // Audio Testing State
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [audioTesting, setAudioTesting] = useState(false);
  const [testAudioLevel, setTestAudioLevel] = useState(0);

  // Agora status
  const [agoraServerConfigured, setAgoraServerConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    agoraVoice
      .getMicrophones()
      .then((mics) => {
        setMicrophones(mics);
        if (mics.length > 0 && !selectedMic) setSelectedMic(mics[0].deviceId);
      })
      .catch(() => {});

    fetch('/api/agora/status')
      .then((res) => res.json())
      .then((data) => setAgoraServerConfigured(data.hasCertificate))
      .catch(() => setAgoraServerConfigured(false));
  }, []);

  const handleUpdatePrefs = (updater: (prev: typeof prefs) => typeof prefs) => {
    const next = updater(prefs);
    setPrefs(next);
    savePreferences(next);
  };

  const handleResetDefaults = () => {
    const fresh = resetPreferences();
    setPrefs(fresh);
    setShowResetConfirm(false);
    onToast('Settings reset to standard defaults.');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const cleanUname = sanitizeUsername(username);
      const updated = await reserveUsernameAndSaveProfile(
        currentUser.uid,
        cleanUname,
        displayName.trim(),
        currentUser.email,
        currentUser.photoURL,
        currentUser.isGuest
      );

      await updatePresenceStatus(currentUser.uid, status, currentGame.trim() || null);
      updated.currentGame = currentGame.trim() || null;
      updated.status = status;

      onProfileUpdated(updated);
      onToast('Profile updated successfully.');
    } catch (err: any) {
      onToast(`Error updating profile: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTestMic = async () => {
    if (audioTesting) {
      setAudioTesting(false);
      setTestAudioLevel(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioTesting(true);

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const microphone = audioCtx.createMediaStreamSource(stream);
      const javascriptNode = audioCtx.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioCtx.destination);

      javascriptNode.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;
        const length = array.length;
        for (let i = 0; i < length; i++) {
          values += array[i];
        }
        const average = values / length;
        setTestAudioLevel(Math.min(100, Math.round(average * 2.5)));
      };
    } catch (e: any) {
      onToast(`Microphone test error: ${e.message}`);
    }
  };

  const desktopEnv = desktop.getEnvironment();

  const accentOptions: { id: AccentColor; label: string; bgHex: string }[] = [
    { id: 'blue', label: 'Classic Blue', bgHex: '#388bfd' },
    { id: 'indigo', label: 'Indigo', bgHex: '#6366f1' },
    { id: 'emerald', label: 'Emerald', bgHex: '#10b981' },
    { id: 'amber', label: 'Warm Amber', bgHex: '#f59e0b' },
    { id: 'rose', label: 'Rose', bgHex: '#f43f5e' },
    { id: 'neutral', label: 'Monochrome Slate', bgHex: '#94a3b8' },
  ];

  return (
    <div className="flex-1 flex h-full bg-slate-50 dark:bg-[#0d1117] overflow-hidden text-slate-800 dark:text-slate-200 transition-colors">
      {/* Settings Navigation sidebar */}
      <aside className="w-60 border-r border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#161b22]/70 backdrop-blur-md p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="px-3 mb-4">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Preferences
            </h3>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'appearance'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Palette className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Appearance & Theme</span>
            </button>

            <button
              onClick={() => setActiveTab('modes')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'modes'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Shrink className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Companion & Xtreme Small</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'profile'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Profile & Account</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'audio'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Mic className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Audio & Voice</span>
            </button>

            <button
              onClick={() => setActiveTab('desktop')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'desktop'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Monitor className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Desktop Integration</span>
            </button>

            <button
              onClick={() => setActiveTab('agora')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                activeTab === 'agora'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Voice Server Setup</span>
            </button>
          </nav>
        </div>

        {/* Bottom controls */}
        <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/5">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Settings Content Viewport */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-3xl">
        {/* ========================================================================= */}
        {/* APPEARANCE & THEME TAB */}
        {/* ========================================================================= */}
        {activeTab === 'appearance' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Appearance & Personalization
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize LIGHT's interface theme, accent styling, density, and motion.
              </p>
            </div>

            {/* 1. Theme Selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Interface Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Light */}
                <button
                  type="button"
                  onClick={() => handleUpdatePrefs((p) => ({ ...p, theme: 'light' }))}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    prefs.theme === 'light'
                      ? 'border-sky-500 ring-2 ring-sky-500/20 bg-white shadow-sm'
                      : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-white/60 dark:bg-[#161b22]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Sun className="w-4 h-4 text-amber-500" />
                    {prefs.theme === 'light' && <Check className="w-3.5 h-3.5 text-sky-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">Light Mode</p>
                    <p className="text-[11px] text-slate-500">Warm neutral whites & gray surfaces</p>
                  </div>
                </button>

                {/* Dark */}
                <button
                  type="button"
                  onClick={() => handleUpdatePrefs((p) => ({ ...p, theme: 'dark' }))}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    prefs.theme === 'dark'
                      ? 'border-sky-500 ring-2 ring-sky-500/20 bg-[#161b22] shadow-sm'
                      : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-white/60 dark:bg-[#161b22]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Moon className="w-4 h-4 text-sky-400" />
                    {prefs.theme === 'dark' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">Dark Mode</p>
                    <p className="text-[11px] text-slate-500">Deep charcoal & restrained contrast</p>
                  </div>
                </button>

                {/* System */}
                <button
                  type="button"
                  onClick={() => handleUpdatePrefs((p) => ({ ...p, theme: 'system' }))}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    prefs.theme === 'system'
                      ? 'border-sky-500 ring-2 ring-sky-500/20 bg-white dark:bg-[#161b22] shadow-sm'
                      : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-white/60 dark:bg-[#161b22]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Laptop className="w-4 h-4 text-slate-500" />
                    {prefs.theme === 'system' && <Check className="w-3.5 h-3.5 text-sky-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">System Sync</p>
                    <p className="text-[11px] text-slate-500">Matches your operating system</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Accent Color Palette */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Accent Color
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {accentOptions.map((opt) => {
                  const isSelected = prefs.accent === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleUpdatePrefs((p) => ({ ...p, accent: opt.id }))}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-sky-500 bg-white dark:bg-[#161b22] ring-1 ring-sky-500/30'
                          : 'border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15 bg-white/40 dark:bg-[#161b22]/40'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: opt.bgHex }}
                      />
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {opt.label}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-sky-500 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Interface Density */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Layout Density
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleUpdatePrefs((p) => ({ ...p, density: 'comfortable' }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    prefs.density === 'comfortable'
                      ? 'border-sky-500 bg-white dark:bg-[#161b22] ring-1 ring-sky-500/30'
                      : 'border-black/5 dark:border-white/5 bg-white/40 dark:bg-[#161b22]/40'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-900 dark:text-white">Comfortable</p>
                  <p className="text-[11px] text-slate-500">Spacious padding and relaxed readability</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdatePrefs((p) => ({ ...p, density: 'compact' }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    prefs.density === 'compact'
                      ? 'border-sky-500 bg-white dark:bg-[#161b22] ring-1 ring-sky-500/30'
                      : 'border-black/5 dark:border-white/5 bg-white/40 dark:bg-[#161b22]/40'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-900 dark:text-white">Compact</p>
                  <p className="text-[11px] text-slate-500">Tighter margins for high information density</p>
                </button>
              </div>
            </div>

            {/* 4. Motion & Reduced Motion */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Animations & Motion
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['normal', 'subtle', 'reduced'] as MotionPreference[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleUpdatePrefs((p) => ({ ...p, motion: m }))}
                    className={`p-3 rounded-xl border text-left capitalize transition-all cursor-pointer ${
                      prefs.motion === m
                        ? 'border-sky-500 bg-white dark:bg-[#161b22] ring-1 ring-sky-500/30 font-medium'
                        : 'border-black/5 dark:border-white/5 bg-white/40 dark:bg-[#161b22]/40'
                    }`}
                  >
                    <p className="text-xs text-slate-900 dark:text-white">{m}</p>
                    <p className="text-[11px] text-slate-500">
                      {m === 'reduced'
                        ? 'Disables animations'
                        : m === 'subtle'
                        ? 'Gentle micro-fades'
                        : 'Standard fluid motion'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* COMPANION & XTREME SMALL MODES TAB */}
        {/* ========================================================================= */}
        {activeTab === 'modes' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Companion Mode & Xtreme Small
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure floating overlays for multitasking, gaming, and ultra-compact desktop presence.
              </p>
            </div>

            {/* Quick Launch Buttons */}
            <div className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#161b22]/70 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Launch Overlays Instantly
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Switch between Normal full desktop, Companion panel, or ultra-compact Xtreme Small.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {onOpenCompanionMode && (
                  <button
                    type="button"
                    onClick={onOpenCompanionMode}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    <span>Launch Companion</span>
                  </button>
                )}
                {onOpenXtremeSmall && (
                  <button
                    type="button"
                    onClick={onOpenXtremeSmall}
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Shrink className="w-3.5 h-3.5" />
                    <span>Launch Xtreme Small</span>
                  </button>
                )}
              </div>
            </div>

            {/* XTREME SMALL CUSTOMIZATION SECTION */}
            <div className="p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#161b22] space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Xtreme Small Configuration
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ultra-compact logo-only visual state that collapses into the LIGHT diamond mark.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1c2128] p-1.5 flex items-center justify-center border border-black/5 dark:border-white/5">
                  <BrandLogo size="custom" iconOnly />
                </div>
              </div>

              {/* Window Shape */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Logo Container Shape
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'rounded', label: 'Rounded Square' },
                      { id: 'circle', label: 'Circular Badge' },
                      { id: 'square', label: 'Sharp Square' },
                    ] as { id: XtremeSmallShape; label: string }[]
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        handleUpdatePrefs((p) => ({
                          ...p,
                          xtremeSmall: { ...p.xtremeSmall, shape: s.id },
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                        prefs.xtremeSmall.shape === s.id
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                          : 'border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Window Size Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Icon Window Size
                  </label>
                  <span className="font-mono text-slate-500">{prefs.xtremeSmall.size}px</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={96}
                  value={prefs.xtremeSmall.size}
                  onChange={(e) =>
                    handleUpdatePrefs((p) => ({
                      ...p,
                      xtremeSmall: { ...p.xtremeSmall, size: Number(e.target.value) },
                    }))
                  }
                  className="w-full h-1.5 accent-sky-500 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>40px (Micro)</span>
                  <span>56px (Default)</span>
                  <span>96px (Large)</span>
                </div>
              </div>

              {/* Click-to-expand Behavior */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Clicking Logo Expands To
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      { id: 'companion', label: 'Companion Mode (Recommended)' },
                      { id: 'full', label: 'Full LIGHT Application' },
                    ] as { id: XtremeSmallClickAction; label: string }[]
                  ).map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() =>
                        handleUpdatePrefs((p) => ({
                          ...p,
                          xtremeSmall: { ...p.xtremeSmall, clickBehavior: act.id },
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-xs text-left font-medium transition-all cursor-pointer ${
                        prefs.xtremeSmall.clickBehavior === act.id
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                          : 'border-black/5 dark:border-white/5'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hover Animation Effect */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Hover Animation
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'scale', label: 'Subtle Scale' },
                      { id: 'outline', label: 'Subtle Ring' },
                      { id: 'none', label: 'None' },
                    ] as { id: XtremeSmallHover; label: string }[]
                  ).map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() =>
                        handleUpdatePrefs((p) => ({
                          ...p,
                          xtremeSmall: { ...p.xtremeSmall, hoverEffect: h.id },
                        }))
                      }
                      className={`p-2 rounded-xl border text-xs text-center font-medium transition-all cursor-pointer ${
                        prefs.xtremeSmall.hoverEffect === h.id
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                          : 'border-black/5 dark:border-white/5'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Always on top toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                <div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Always on Top (Desktop Layer)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Keep Xtreme Small floating over games and other windows.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.xtremeSmall.alwaysOnTop}
                  onChange={(e) =>
                    handleUpdatePrefs((p) => ({
                      ...p,
                      xtremeSmall: { ...p.xtremeSmall, alwaysOnTop: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-sky-500 cursor-pointer"
                />
              </div>
            </div>

            {/* COMPANION MODE CUSTOMIZATION SECTION */}
            <div className="p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#161b22] space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Companion Mode Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compact floating card for active voice controls while in-game.
                </p>
              </div>

              {/* Opacity slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Default Panel Opacity
                  </label>
                  <span className="font-mono text-slate-500">{prefs.companion.opacity}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={prefs.companion.opacity}
                  onChange={(e) =>
                    handleUpdatePrefs((p) => ({
                      ...p,
                      companion: { ...p.companion, opacity: Number(e.target.value) },
                    }))
                  }
                  className="w-full h-1.5 accent-sky-500 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Show Participant Avatars
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Displays member avatars and active speaker badges in the card.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.companion.showAvatars}
                    onChange={(e) =>
                      handleUpdatePrefs((p) => ({
                        ...p,
                        companion: { ...p.companion, showAvatars: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Show Connection Status
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Displays connected/connecting state text indicators.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.companion.showConnectionStatus}
                    onChange={(e) =>
                      handleUpdatePrefs((p) => ({
                        ...p,
                        companion: { ...p.companion, showConnectionStatus: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Show Text Labels on Control Buttons
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Displays Mute/Deafen text next to mic icons.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.companion.showButtonLabels}
                    onChange={(e) =>
                      handleUpdatePrefs((p) => ({
                        ...p,
                        companion: { ...p.companion, showButtonLabels: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROFILE TAB */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">My Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your gamer identity, handle, and in-game status.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  name={currentUser.displayName}
                  photoURL={currentUser.photoURL}
                  size="xl"
                  status={currentUser.status}
                />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    {currentUser.displayName}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">@{currentUser.username}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {currentUser.isGuest ? 'Guest Account' : 'Verified Google Account'}
                  </p>
                </div>
              </div>

              {currentUser.isGuest && (
                <button
                  type="button"
                  onClick={onOpenUpgradeModal}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Link Google Account</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Unique Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500"
                    maxLength={20}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Game Activity
                </label>
                <div className="relative">
                  <Gamepad2 className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Counter-Strike 2, Valorant, Baldur's Gate 3"
                    value={currentGame}
                    onChange={(e) => setCurrentGame(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* AUDIO & VOICE TAB */}
        {/* ========================================================================= */}
        {activeTab === 'audio' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Audio & Voice Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure input devices and test microphone input levels.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Input Microphone Device
                </label>
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                >
                  {microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mic Test */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      Microphone Test
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Speak into your microphone to verify detection level.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestMic}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      audioTesting
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300'
                    }`}
                  >
                    {audioTesting ? 'Stop Test' : 'Test Mic'}
                  </button>
                </div>

                {audioTesting && (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-75"
                        style={{ width: `${testAudioLevel}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Input Level</span>
                      <span>{testAudioLevel}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DESKTOP INTEGRATION TAB */}
        {/* ========================================================================= */}
        {activeTab === 'desktop' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Desktop Integration & Runtime
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Native desktop capabilities, window overlays, and hotkeys.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-500" />
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Active Runtime: {desktopEnv.isTauri ? 'Native Desktop (Tauri)' : 'Web Browser Preview'}
                </h4>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {desktopEnv.isTauri
                  ? 'LIGHT is running inside the native Tauri desktop environment. Global shortcuts, native OS tray minimization, and hardware always-on-top window layering are fully enabled.'
                  : 'LIGHT is running in web browser preview mode. Floating overlays (Companion Mode and Xtreme Small) are accurately simulated with high z-index and viewport positioning. When compiled with Tauri into a native desktop executable, these overlays gain true OS-level always-on-top capabilities over full-screen games.'}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#1c2128]">
                  <span className="text-slate-500 block text-[10px]">ALWAYS-ON-TOP</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {desktopEnv.hasAlwaysOnTopSupport ? 'Native OS Window' : 'Viewport Simulated'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#1c2128]">
                  <span className="text-slate-500 block text-[10px]">TOGGLE SHORTCUT</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Ctrl + Shift + M
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* AGORA SERVER SETUP TAB */}
        {/* ========================================================================= */}
        {activeTab === 'agora' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Agora Voice Token Server
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server-side security certificate status for high-definition voice channels.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    App Certificate Status
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {agoraServerConfigured
                      ? 'Secure RTC token generation is configured and active.'
                      : 'Server requires AGORA_APP_CERTIFICATE in environment.'}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold ${
                    agoraServerConfigured
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                  }`}
                >
                  {agoraServerConfigured ? 'CERTIFICATE ACTIVE' : 'TESTING MODE'}
                </span>
              </div>

              <button
                type="button"
                onClick={onShowAgoraModal}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                View Setup Instructions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1c2128] border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Reset Personalization Defaults?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This will restore the standard Dark theme, Classic Blue accent, Comfortable density, and default Companion & Xtreme Small sizes.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
