import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Sparkles,
  Volume2,
  VolumeX,
  Settings,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { VoiceSessionState, UserProfile } from '../../types';
import { agoraVoice } from '../../services/agora';
import { Avatar } from '../common/Avatar';

interface VoiceRoomViewProps {
  voiceState: VoiceSessionState;
  currentUser: UserProfile;
  onOpenMiniCompanion: () => void;
  onCloseView: () => void;
  onShowConfigModal: () => void;
}

export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({
  voiceState,
  currentUser,
  onOpenMiniCompanion,
  onCloseView,
  onShowConfigModal,
}) => {
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState('');

  useEffect(() => {
    agoraVoice
      .getMicrophones()
      .then((mics) => {
        setMicrophones(mics);
        if (mics.length > 0 && !selectedMicId) {
          setSelectedMicId(mics[0].deviceId);
        }
      })
      .catch(() => {});
  }, []);

  const handleMicSelect = async (deviceId: string) => {
    setSelectedMicId(deviceId);
    await agoraVoice.setMicrophone(deviceId);
  };

  const handleToggleMute = async () => {
    await agoraVoice.toggleMute();
  };

  const handleToggleDeafen = async () => {
    await agoraVoice.toggleDeafen();
  };

  const handleDisconnect = async () => {
    await agoraVoice.leaveVoiceRoom();
    onCloseView();
  };

  if (!voiceState.isConnected && !voiceState.isConnecting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#0d1117] text-slate-800 dark:text-slate-200 text-center transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161b22] border border-black/5 dark:border-white/5 flex items-center justify-center mb-3 text-slate-400">
          <PhoneOff className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-1">
          Not in Voice Channel
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
          Join any squad voice room or call a friend to begin speaking.
        </p>
        <button
          onClick={onCloseView}
          className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0d1117] p-6 text-slate-800 dark:text-slate-200 overflow-hidden select-none transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-black/5 dark:border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {voiceState.groupName || 'Voice Room'}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-500/20">
              CONNECTED
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            Channel: {voiceState.channelName} · {voiceState.participants.length} Active Participants
          </p>
        </div>

        <div className="flex items-center gap-2">
          {voiceState.error && voiceState.error.includes('SERVER_NEEDS_CERTIFICATE') && (
            <button
              onClick={onShowConfigModal}
              className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-1.5 hover:bg-amber-100 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Agora Server Setup</span>
            </button>
          )}

          <button
            onClick={onOpenMiniCompanion}
            className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>Launch Companion</span>
          </button>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 overflow-y-auto py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {voiceState.participants.map((p) => {
            const isSelf = p.uid === currentUser.uid;
            return (
              <div
                key={p.uid}
                className={`relative rounded-2xl p-6 flex flex-col items-center justify-center border transition-all duration-150 ${
                  p.isSpeaking
                    ? 'bg-white dark:bg-[#161b22] border-sky-400 ring-2 ring-sky-500/20 shadow-md'
                    : 'bg-white/80 dark:bg-[#161b22]/70 border-black/5 dark:border-white/5 shadow-xs'
                }`}
              >
                {/* Speaking Ring Avatar */}
                <div className="relative mb-3">
                  <Avatar
                    name={p.displayName}
                    photoURL={p.photoURL}
                    size="xl"
                    isSpeaking={p.isSpeaking}
                  />
                  {p.isMuted && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center border-2 border-white dark:border-[#161b22]">
                      <MicOff className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div className="text-center min-w-0 w-full px-2">
                  <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                    {p.displayName} {isSelf && '(You)'}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">@{p.username}</p>
                </div>

                {/* Voice Volume Meter */}
                <div className="w-20 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, (p.audioLevel || 0) * 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Bar at Bottom */}
      <div className="border-t border-black/5 dark:border-white/5 pt-4 flex flex-wrap items-center justify-between gap-4">
        {/* Device selector */}
        <div className="flex items-center gap-2">
          {microphones.length > 0 && (
            <select
              value={selectedMicId}
              onChange={(e) => handleMicSelect(e.target.value)}
              className="bg-white dark:bg-[#161b22] border border-black/10 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500"
            >
              {microphones.map((m) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || `Microphone ${m.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Central action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              voiceState.isMuted
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300'
            }`}
          >
            {voiceState.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{voiceState.isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          <button
            onClick={handleToggleDeafen}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              voiceState.isDeafened
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300'
            }`}
          >
            {voiceState.isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
            <span>{voiceState.isDeafened ? 'Deafened' : 'Deafen'}</span>
          </button>

          <button
            onClick={handleDisconnect}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave Voice</span>
          </button>
        </div>

        <button
          onClick={onCloseView}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          Hide View
        </button>
      </div>
    </div>
  );
};
