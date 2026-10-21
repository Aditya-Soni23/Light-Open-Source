import React from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Radio,
  Sparkles,
  Shrink,
  VolumeX,
  AlertCircle
} from 'lucide-react';
import { VoiceSessionState, UserProfile } from '../../types';
import { agoraVoice } from '../../services/agora';
import { Avatar } from '../common/Avatar';

interface VoiceBarProps {
  voiceState: VoiceSessionState;
  currentUser: UserProfile;
  onOpenMiniCompanion: () => void;
  onOpenXtremeSmall?: () => void;
  onOpenVoiceRoomView: () => void;
  onShowConfigModal: () => void;
}

export const VoiceBar: React.FC<VoiceBarProps> = ({
  voiceState,
  currentUser,
  onOpenMiniCompanion,
  onOpenXtremeSmall,
  onOpenVoiceRoomView,
  onShowConfigModal,
}) => {
  if (!voiceState.isConnected && !voiceState.isConnecting && !voiceState.error) {
    return null;
  }

  const handleToggleMute = async () => {
    await agoraVoice.toggleMute();
  };

  const handleToggleDeafen = async () => {
    await agoraVoice.toggleDeafen();
  };

  const handleDisconnect = async () => {
    await agoraVoice.leaveVoiceRoom();
  };

  return (
    <div className="h-13 light-surface light-divider border-t px-4 flex items-center justify-between shrink-0 select-none z-30 transition-colors">
      {/* Left: Connection info */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenVoiceRoomView}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              voiceState.isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                : voiceState.error
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 animate-pulse'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-accent-hover dark:group-hover:text-accent transition-colors truncate">
                {voiceState.groupName || 'Voice Channel'}
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                {voiceState.isConnected ? 'CONNECTED' : voiceState.isConnecting ? 'CONNECTING...' : 'ERROR'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              {voiceState.participants.length} connected · View Channel
            </p>
          </div>
        </button>

        {voiceState.error && voiceState.error.includes('SERVER_NEEDS_CERTIFICATE') && (
          <button
            onClick={onShowConfigModal}
            className="hidden md:flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
          >
            <AlertCircle className="w-3 h-3" />
            <span>Configure Voice Key</span>
          </button>
        )}
      </div>

      {/* Center: Controls (Mute, Deafen, Disconnect) */}
      <div className="flex items-center gap-2">
        {/* Mute Button */}
        <button
          onClick={handleToggleMute}
          title={voiceState.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            voiceState.isMuted
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {voiceState.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{voiceState.isMuted ? 'Muted' : 'Mute'}</span>
        </button>

        {/* Deafen Button */}
        <button
          onClick={handleToggleDeafen}
          title={voiceState.isDeafened ? 'Undeafen Audio' : 'Deafen Audio'}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            voiceState.isDeafened
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {voiceState.isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{voiceState.isDeafened ? 'Deafened' : 'Deafen'}</span>
        </button>

        {/* Disconnect Button */}
        <button
          onClick={handleDisconnect}
          title="Disconnect from Voice"
          className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Participant preview & Mode Launchers */}
      <div className="flex items-center gap-2">
        {/* Avatars */}
        <div className="hidden lg:flex items-center -space-x-1.5">
          {voiceState.participants.slice(0, 3).map((p) => (
            <Avatar
              key={p.uid}
              name={p.displayName}
              photoURL={p.photoURL}
              size="sm"
              isSpeaking={p.isSpeaking}
            />
          ))}
        </div>

        {/* Launch Companion */}
        <button
          onClick={onOpenMiniCompanion}
          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Open Companion floating card"
        >
          <Sparkles className="w-3 h-3 text-accent" />
          <span className="hidden md:inline">Companion</span>
        </button>

        {/* Launch Xtreme Small */}
        {onOpenXtremeSmall && (
          <button
            onClick={onOpenXtremeSmall}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Collapse to Xtreme Small (Logo only)"
          >
            <Shrink className="w-3 h-3 text-accent" />
            <span className="hidden md:inline">Xtreme</span>
          </button>
        )}
      </div>
    </div>
  );
};
