import React, { useState, useEffect } from 'react';
import {
  Minus,
  Square,
  X,
  Gamepad2,
  Shield,
  Sparkles,
  Shrink,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo';
import { UserProfile, UserPresenceStatus } from '../../types';
import { desktop } from '../../services/desktop';
import { updatePresenceStatus } from '../../services/presence';
import {
  getPreferences,
  savePreferences,
  AppTheme
} from '../../services/preferences';

interface TopHeaderProps {
  userProfile: UserProfile | null;
  activeViewTitle: string;
  onOpenUpgradeModal?: () => void;
  onOpenCompanionMode?: () => void;
  onOpenXtremeSmall?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  userProfile,
  activeViewTitle,
  onOpenUpgradeModal,
  onOpenCompanionMode,
  onOpenXtremeSmall,
}) => {
  const desktopEnv = desktop.getEnvironment();
  const [prefs, setPrefs] = useState(getPreferences());

  useEffect(() => {
    setPrefs(getPreferences());
  }, []);

  const handleCycleTheme = () => {
    const cycle: Record<AppTheme, AppTheme> = {
      dark: 'light',
      light: 'system',
      system: 'dark',
    };
    const nextTheme = cycle[prefs.theme];
    const updated = { ...prefs, theme: nextTheme };
    setPrefs(updated);
    savePreferences(updated);
  };

  return (
    <header data-tauri-drag-region className="h-11 light-surface light-divider border-b flex items-center justify-between px-3.5 select-none shrink-0 z-30 transition-colors">
      {/* Left zone: Brand wordmark & breadcrumb */}
      <div className="flex items-center gap-2.5">
        <BrandLogo size="mini" />
        <span className="text-slate-300 dark:text-slate-700 text-xs">/</span>
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {activeViewTitle}
        </span>

        {userProfile?.isGuest ? (
          <button
            onClick={onOpenUpgradeModal}
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 transition-colors cursor-pointer"
            title="Guest account. Google account linking is coming soon."
          >
            <Shield className="w-3 h-3" />
            <span>Guest</span>
          </button>
        ) : null}
      </div>

      {/* Center zone: Playing status or quiet product marker */}
      <div className="hidden md:flex items-center gap-2">
        {userProfile?.currentGame ? (
          <div className="flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/30 px-2 py-0.5 rounded-md">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="font-medium">Playing:</span>
            <span className="text-slate-900 dark:text-slate-200">{userProfile.currentGame}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <span>LIGHT Desktop</span>
            <span>·</span>
            <span>DIAMOND</span>
          </div>
        )}
      </div>

      {/* Right zone: Mode quick switches & Window controls */}
      <div className="flex items-center gap-1">
        {/* Quick Theme Cycle Button */}
        <button
          onClick={handleCycleTheme}
          data-tauri-drag-region="false"
          title={`Active Theme: ${prefs.theme} (Click to switch)`}
          className="w-7 h-7 flex items-center justify-center light-icon-button cursor-pointer"
        >
          {prefs.theme === 'light' ? (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          ) : prefs.theme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-sky-400" />
          ) : (
            <Laptop className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Quick Launch Companion */}
        {onOpenCompanionMode && (
          <button
            onClick={onOpenCompanionMode}
            data-tauri-drag-region="false"
            title="Launch Floating Companion Mode"
            className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 light-icon-button px-2 py-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-sky-500" />
            <span>Companion</span>
          </button>
        )}

        {/* Quick Launch Xtreme Small */}
        {onOpenXtremeSmall && (
          <button
            onClick={onOpenXtremeSmall}
            data-tauri-drag-region="false"
            title="Collapse to Xtreme Small (Logo only)"
            className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 light-icon-button px-2 py-1 cursor-pointer"
          >
            <Shrink className="w-3 h-3 text-sky-500" />
            <span>Xtreme Small</span>
          </button>
        )}

        <div className="w-px h-3.5 bg-black/5 dark:bg-white/10 mx-1 hidden sm:block" />

        {/* Window controls */}
        <button
          onClick={() => desktop.minimizeWindow()}
          data-tauri-drag-region="false"
          title="Minimize"
          className="w-7 h-7 flex items-center justify-center light-icon-button"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => desktop.toggleMaximize()}
          data-tauri-drag-region="false"
          title="Maximize"
          className="w-7 h-7 flex items-center justify-center light-icon-button"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => desktop.closeWindow()}
          data-tauri-drag-region="false"
          title="Close"
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
