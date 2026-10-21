import React, { useEffect, useMemo, useState } from 'react';
import { Expand, Mic, MicOff, PhoneOff, Pin, Radio, Shrink, Volume2, VolumeX, X } from 'lucide-react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { VoiceSessionState } from '../../types';
import { BrandLogo } from '../brand/BrandLogo';
import { getPreferences, savePreferences } from '../../services/preferences';

type OverlayMode = 'companion' | 'xtreme-small';

const idleState: VoiceSessionState = {
  isConnected: false,
  isConnecting: false,
  channelId: null,
  channelName: null,
  groupName: null,
  isMuted: true,
  isDeafened: false,
  speakingUid: null,
  participants: [],
  error: null,
};

/**
 * This is rendered only in a dedicated Tauri window. The actual Agora client
 * remains in the main window; BroadcastChannel keeps controls and state in sync.
 */
export const DesktopOverlay: React.FC<{ mode: OverlayMode }> = ({ mode }) => {
  const [voice, setVoice] = useState<VoiceSessionState>(idleState);
  const [prefs, setPrefs] = useState(getPreferences());
  const channel = useMemo(() => new BroadcastChannel('light-desktop-overlay'), []);

  useEffect(() => {
    channel.postMessage({ type: 'overlay-ready' });
    channel.onmessage = (event: MessageEvent<{ type: string; state?: VoiceSessionState }>) => {
      if (event.data.type === 'voice-state' && event.data.state) setVoice(event.data.state);
    };
    return () => channel.close();
  }, [channel]);

  const command = (type: string) => channel.postMessage({ type });
  const applyWindowPreferences = async (next = prefs) => {
    const nativeWindow = getCurrentWindow();
    const compact = mode === 'xtreme-small';
    const side = compact ? next.xtremeSmall.size : next.companion.width;
    await nativeWindow.setAlwaysOnTop(compact ? next.xtremeSmall.alwaysOnTop : next.companion.alwaysOnTop);
    await nativeWindow.setSize(new LogicalSize(side, compact ? side : 430));
  };
  const updatePrefs = async (next: typeof prefs) => {
    setPrefs(next);
    savePreferences(next);
    await applyWindowPreferences(next);
  };

  useEffect(() => {
    applyWindowPreferences().catch((error) => console.warn('[Overlay] Could not apply preferences:', error));
  // Apply on initial window creation; updates use updatePrefs above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const close = async () => {
    command('close-overlay');
    await getCurrentWindow().hide();
  };

  if (mode === 'xtreme-small') {
    return (
      <div style={{ opacity: prefs.xtremeSmall.opacity / 100 }} className="w-screen h-screen rounded-2xl overflow-hidden border border-accent/50 bg-[#101722]/95 shadow-2xl relative">
        <button type="button" data-tauri-drag-region onDoubleClick={() => command('show-main')} onClick={() => command('open-companion')} title="Drag to move. Click for Companion; double-click for full app." className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center">
          <span className="pointer-events-none w-14 h-14"><BrandLogo size="custom" iconOnly /></span>
          {voice.isConnected && <span className="absolute right-2 top-2 w-2.5 h-2.5 rounded-full bg-emerald-400" />}
        </button>
        <input aria-label="Xtreme Small size" type="range" min="40" max="96" value={prefs.xtremeSmall.size} onChange={(e) => updatePrefs({ ...prefs, xtremeSmall: { ...prefs.xtremeSmall, size: Number(e.target.value) } })} className="absolute bottom-1 left-2 right-2 w-[calc(100%-1rem)] h-1 opacity-0 hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div style={{ opacity: prefs.companion.opacity / 100 }} className="w-screen h-screen overflow-hidden rounded-2xl border border-white/15 bg-[#111827]/95 text-white shadow-2xl select-none">
      <header data-tauri-drag-region className="h-10 px-3 flex items-center justify-between bg-[#182235] cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 pointer-events-none"><span className="w-5 h-5"><BrandLogo size="custom" iconOnly /></span><span className="text-xs font-semibold">LIGHT Companion</span></div>
        <div className="flex gap-1" data-tauri-drag-region="false">
          <button onClick={() => updatePrefs({ ...prefs, companion: { ...prefs.companion, alwaysOnTop: !prefs.companion.alwaysOnTop } })} title={prefs.companion.alwaysOnTop ? 'Unpin window' : 'Pin above other windows'} className={`p-1.5 rounded ${prefs.companion.alwaysOnTop ? 'text-accent bg-accent/15' : 'hover:bg-white/10'}`}><Pin className="w-3.5 h-3.5" /></button>
          <button onClick={() => command('open-xtreme-small')} title="Switch to Xtreme Small" className="p-1.5 hover:bg-white/10 rounded"><Shrink className="w-3.5 h-3.5" /></button>
          <button onClick={() => command('show-main')} title="Open full app" className="p-1.5 hover:bg-white/10 rounded"><Expand className="w-3.5 h-3.5" /></button>
          <button onClick={close} title="Hide companion" className="p-1.5 hover:bg-rose-500/30 rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </header>
      <main className="p-4 space-y-4">
        <div><p className="text-sm font-semibold truncate">{voice.groupName || 'No active voice room'}</p><p className="text-[11px] text-slate-400 mt-1">{voice.isConnected ? `${voice.participants.length} connected` : voice.isConnecting ? 'Connecting…' : 'Join a voice room from LIGHT'}</p></div>
        <div className="grid grid-cols-3 gap-2">
          <button disabled={!voice.isConnected} onClick={() => command('toggle-mute')} className="py-3 rounded-xl bg-slate-800 disabled:opacity-40 hover:bg-slate-700 flex flex-col items-center gap-1 text-[10px]">{voice.isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />} {voice.isMuted ? 'Muted' : 'Mute'}</button>
          <button disabled={!voice.isConnected} onClick={() => command('toggle-deafen')} className="py-3 rounded-xl bg-slate-800 disabled:opacity-40 hover:bg-slate-700 flex flex-col items-center gap-1 text-[10px]">{voice.isDeafened ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />} Deafen</button>
          <button disabled={!voice.isConnected} onClick={() => command('leave-voice')} className="py-3 rounded-xl bg-rose-500/15 text-rose-300 disabled:opacity-40 hover:bg-rose-500/25 flex flex-col items-center gap-1 text-[10px]"><PhoneOff className="w-4 h-4" /> Leave</button>
        </div>
        <button onClick={() => command('open-voice-chat')} disabled={!voice.isConnected} className="w-full py-2.5 rounded-xl bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40 flex items-center justify-center gap-2 text-[11px] font-medium"><Radio className="w-4 h-4" /> Open current voice chat</button>
        <div className="space-y-2 text-[10px] text-slate-400">
          <label className="flex items-center justify-between gap-2"><span>Opacity</span><input aria-label="Companion opacity" type="range" min="40" max="100" value={prefs.companion.opacity} onChange={(e) => updatePrefs({ ...prefs, companion: { ...prefs.companion, opacity: Number(e.target.value) } })} className="flex-1 accent-accent" /></label>
          <label className="flex items-center justify-between gap-2"><span>Width</span><input aria-label="Companion width" type="range" min="250" max="420" value={prefs.companion.width} onChange={(e) => updatePrefs({ ...prefs, companion: { ...prefs.companion, width: Number(e.target.value) } })} className="flex-1 accent-accent" /></label>
        </div>
      </main>
    </div>
  );
};
