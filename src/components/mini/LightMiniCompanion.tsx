import React, { useState, useEffect, useRef } from 'react';
import {
  GripHorizontal,
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Maximize2,
  Minimize2,
  Pin,
  X,
  VolumeX,
  Radio,
  Sliders,
  Expand,
  Sparkles,
  Shrink
} from 'lucide-react';
import { VoiceSessionState, UserProfile } from '../../types';
import { agoraVoice } from '../../services/agora';
import { desktop } from '../../services/desktop';
import { Avatar } from '../common/Avatar';
import { BrandLogo } from '../brand/BrandLogo';
import { getPreferences, savePreferences } from '../../services/preferences';

interface LightMiniCompanionProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToXtremeSmall: () => void;
  onExpandToFullApp: () => void;
  voiceState: VoiceSessionState;
  currentUser: UserProfile;
}

export const LightMiniCompanion: React.FC<LightMiniCompanionProps> = ({
  isOpen,
  onClose,
  onSwitchToXtremeSmall,
  onExpandToFullApp,
  voiceState,
  currentUser,
}) => {
  const prefs = getPreferences();
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 24,
    initialY: 24,
  });

  // Mode settings from preferences
  const [opacity, setOpacity] = useState(prefs.companion.opacity || 92);
  const [alwaysOnTop, setAlwaysOnTop] = useState(prefs.companion.alwaysOnTop ?? true);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [panelWidth, setPanelWidth] = useState(prefs.companion.width || 280);

  // Position defaults on mount to top right
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultX = Math.max(20, window.innerWidth - panelWidth - 24);
      const defaultY = 64;
      setPosition({ x: defaultX, y: defaultY });
    }
  }, [panelWidth]);

  // Sync Always-on-top with desktop service
  useEffect(() => {
    if (isOpen) {
      desktop.setAlwaysOnTop(alwaysOnTop).catch(() => {});
    }
  }, [isOpen, alwaysOnTop]);

  // Keyboard shortcut listener: Ctrl+Shift+M to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Mouse drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const maxX = window.innerWidth - panelWidth - 10;
      const maxY = window.innerHeight - 80;

      setPosition({
        x: Math.max(10, Math.min(maxX, dragRef.current.initialX + dx)),
        y: Math.max(10, Math.min(maxY, dragRef.current.initialY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, panelWidth]);

  if (!isOpen) return null;

  const handleToggleAlwaysOnTop = async () => {
    const nextVal = !alwaysOnTop;
    setAlwaysOnTop(nextVal);
    await desktop.setAlwaysOnTop(nextVal);
    const cur = getPreferences();
    savePreferences({
      ...cur,
      companion: {
        ...cur.companion,
        alwaysOnTop: nextVal,
      },
    });
  };

  const handleOpacityChange = (newVal: number) => {
    setOpacity(newVal);
    const cur = getPreferences();
    savePreferences({
      ...cur,
      companion: {
        ...cur.companion,
        opacity: newVal,
      },
    });
  };

  const handleToggleMute = async () => {
    await agoraVoice.toggleMute();
  };

  const handleToggleDeafen = async () => {
    await agoraVoice.toggleDeafen();
  };

  const handleLeaveVoice = async () => {
    await agoraVoice.leaveVoiceRoom();
  };

  const activeSpeaker = voiceState.participants.find((p) => p.isSpeaking);

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        opacity: opacity / 100,
        zIndex: 9999,
        width: `${panelWidth}px`,
      }}
      className="fixed top-0 left-0 select-none transition-opacity duration-150"
    >
      <div className="light-surface light-divider border rounded-xl shadow-sm overflow-hidden text-slate-800 dark:text-slate-100 transition-colors">
        {/* Drag header */}
        <div
          onMouseDown={handleMouseDown}
          className="px-3 py-2 light-subtle light-divider border-b flex items-center justify-between cursor-grab active:cursor-grabbing text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-slate-900 dark:text-white tracking-tight">LIGHT</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">COMPANION</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 no-drag">
            {/* Opacity slider toggle */}
            <button
              onClick={() => setShowOpacitySlider(!showOpacitySlider)}
              title="Adjust Opacity"
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <Sliders className="w-3 h-3" />
            </button>

            {/* Always on top */}
            <button
              onClick={handleToggleAlwaysOnTop}
              title={alwaysOnTop ? 'Always-on-top Enabled' : 'Always-on-top Disabled'}
              className={`p-1 rounded-md transition-colors ${
                alwaysOnTop
                  ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Pin className="w-3 h-3" />
            </button>

            {/* Switch to Xtreme Small Mode */}
            <button
              onClick={onSwitchToXtremeSmall}
              title="Collapse to Xtreme Small (Logo only)"
              className="p-1 rounded-md hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-600 dark:text-sky-400 transition-colors flex items-center gap-0.5"
            >
              <Shrink className="w-3 h-3" />
            </button>

            {/* Expand to Full App */}
            <button
              onClick={onExpandToFullApp}
              title="Expand to Full LIGHT Application"
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <Expand className="w-3 h-3" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="Close Companion (Ctrl+Shift+M)"
              className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Opacity slider popover */}
        {showOpacitySlider && (
          <div className="px-3 py-2 bg-slate-100 dark:bg-[#12151b] border-b border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-mono no-drag">
            <span className="text-slate-500 dark:text-slate-400">Opacity: {opacity}%</span>
            <input
              type="range"
              min={40}
              max={100}
              value={opacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              className="w-28 h-1 accent-sky-500 bg-slate-300 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Body content */}
        <div className="p-3 space-y-3">
          {/* Room status header */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {voiceState.groupName || 'Voice Room'}
              </p>
              {prefs.companion.showConnectionStatus && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      voiceState.isConnected
                        ? 'bg-emerald-500'
                        : voiceState.isConnecting
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {voiceState.isConnected ? 'Connected' : voiceState.isConnecting ? 'Connecting...' : 'Idle'}
                  </span>
                </div>
              )}
            </div>

            {voiceState.isConnected && (
              <button
                onClick={handleLeaveVoice}
                title="Disconnect from voice"
                className="no-drag p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition-colors"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Participant avatars or count */}
          {prefs.companion.showAvatars ? (
            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
              {voiceState.participants.length === 0 ? (
                <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-2">
                  No active voice participants
                </div>
              ) : (
                voiceState.participants.map((p) => {
                  const isSelf = p.uid === currentUser.uid;
                  return (
                    <div
                      key={p.uid}
                      className={`flex items-center justify-between p-1.5 rounded-xl transition-all ${
                        p.isSpeaking
                          ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-300/40 dark:border-sky-500/30 text-sky-900 dark:text-sky-200'
                          : 'bg-slate-50 dark:bg-[#1c2128]/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          name={p.displayName}
                          photoURL={p.photoURL}
                          size="sm"
                          isSpeaking={p.isSpeaking}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">
                            {p.displayName} {isSelf && '(You)'}
                          </p>
                          <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate">
                            @{p.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {p.isMuted && <MicOff className="w-3 h-3 text-rose-500" />}
                        {p.isDeafened && <VolumeX className="w-3 h-3 text-rose-500" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="py-1 px-2 rounded-lg bg-slate-50 dark:bg-[#1c2128] text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Voice Members</span>
              <span className="font-mono font-medium">{voiceState.participants.length} connected</span>
            </div>
          )}

          {/* Voice Control Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5 dark:border-white/5 no-drag">
            <button
              onClick={handleToggleMute}
              disabled={!voiceState.isConnected}
              className={`py-1.5 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
                voiceState.isMuted
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-300/50 dark:border-rose-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {voiceState.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {prefs.companion.showButtonLabels && (
                <span>{voiceState.isMuted ? 'Muted' : 'Mute'}</span>
              )}
            </button>

            <button
              onClick={handleToggleDeafen}
              disabled={!voiceState.isConnected}
              className={`py-1.5 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
                voiceState.isDeafened
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-300/50 dark:border-rose-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {voiceState.isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
              {prefs.companion.showButtonLabels && (
                <span>{voiceState.isDeafened ? 'Deafened' : 'Deafen'}</span>
              )}
            </button>
          </div>

          {/* Quick Switch to Xtreme Small Banner */}
          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono no-drag">
            <span>Ctrl+Shift+M to toggle</span>
            <button
              onClick={onSwitchToXtremeSmall}
              className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xtreme Small</span>
              <Shrink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
