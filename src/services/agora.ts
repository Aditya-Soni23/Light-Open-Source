import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  UID
} from 'agora-rtc-sdk-ng';
import { auth } from './firebase';
import { getUserProfile } from './auth';
import { VoiceParticipant, VoiceSessionState } from '../types';
import { normalizeVoiceChannelName } from './voiceChannel';

// Agora App ID supplied for LIGHT
export const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '8c3ee7f5209846b99763087d2cab533a';
// Browser development uses the local Express server. Native builds should set
// VITE_API_BASE_URL to the HTTPS origin of the deployed token service.
const VOICE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// Enable lower-level Agora console logging in production
AgoraRTC.setLogLevel(2); // 0: DEBUG, 1: INFO, 2: WARNING, 3: ERROR

export type VoiceStateListener = (state: VoiceSessionState) => void;

class AgoraVoiceService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private listeners: Set<VoiceStateListener> = new Set();
  private resolvingParticipantProfiles = new Set<string>();

  private state: VoiceSessionState = {
    isConnected: false,
    isConnecting: false,
    channelId: null,
    channelName: null,
    groupName: null,
    isMuted: true, // Default to muted on join for user privacy & awareness
    isDeafened: false,
    speakingUid: null,
    participants: [],
    error: null,
  };

  constructor() {
    this.initClient();
  }

  private initClient() {
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    this.setupClientEvents();
  }

  private setupClientEvents() {
    if (!this.client) return;

    // A participant can join while muted, so resolve their chosen profile as
    // soon as Agora sees them rather than waiting for an audio publication.
    this.client.on('user-joined', (user) => {
      this.updateRemoteParticipant(user.uid, { isMuted: true });
    });

    // Remote user publishes audio stream
    this.client.on('user-published', async (user, mediaType) => {
      if (mediaType === 'audio') {
        try {
          await this.client?.subscribe(user, mediaType);
          if (!this.state.isDeafened && user.audioTrack) {
            user.audioTrack.play();
          }
          this.updateRemoteParticipant(user.uid, { isMuted: false });
        } catch (err: any) {
          console.error('[Agora] Error subscribing to remote user:', err);
        }
      }
    });

    // Remote user stops audio
    this.client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio') {
        this.updateRemoteParticipant(user.uid, { isMuted: true, isSpeaking: false, audioLevel: 0 });
      }
    });

    // Remote user leaves
    this.client.on('user-left', (user) => {
      this.state.participants = this.state.participants.filter(
        (p) => String(p.agoraUid) !== String(user.uid)
      );
      this.notify();
    });

    // Volume level events for live speaking indicator (real audio volume)
    this.client.enableAudioVolumeIndicator();
    this.client.on('volume-indicator', (volumes) => {
      let currentDominantSpeaker: string | null = null;
      let maxLevel = 10; // Threshold to consider speaking

      volumes.forEach((vol) => {
        const isSelf = vol.uid === 0 || String(vol.uid) === String(auth.currentUser?.uid);
        const targetUid = isSelf ? (auth.currentUser?.uid || 'self') : String(vol.uid);

        if (vol.level > maxLevel) {
          maxLevel = vol.level;
          currentDominantSpeaker = targetUid;
        }

        // Update participant speaking level
        const existing = this.state.participants.find((p) => p.uid === targetUid);
        if (existing) {
          existing.audioLevel = vol.level;
          existing.isSpeaking = vol.level > 12;
        }
      });

      this.state.speakingUid = currentDominantSpeaker;
      this.notify();
    });

    // Connection state changes
    this.client.on('connection-state-change', (curState, _revState, reason) => {
      console.log(`[Agora] Connection state: ${curState}, reason: ${reason}`);
      if (curState === 'DISCONNECTED' && this.state.isConnected) {
        this.state.isConnected = false;
        this.state.isConnecting = false;
        this.notify();
      }
    });
  }

  private updateRemoteParticipant(agoraUid: UID, updates: Partial<VoiceParticipant>) {
    const existing = this.state.participants.find((p) => String(p.agoraUid) === String(agoraUid));
    if (existing) {
      Object.assign(existing, updates);
    } else {
      this.state.participants.push({
        uid: String(agoraUid),
        agoraUid,
        displayName: 'Voice participant',
        username: 'member',
        isMuted: updates.isMuted ?? false,
        isDeafened: false,
        isSpeaking: false,
        audioLevel: 0,
      });
    }
    void this.resolveRemoteParticipantProfile(agoraUid);
    this.notify();
  }

  /** Agora receives the Firebase UID; resolve it to the profile people chose. */
  private async resolveRemoteParticipantProfile(agoraUid: UID) {
    const uid = String(agoraUid);
    if (uid === auth.currentUser?.uid || this.resolvingParticipantProfiles.has(uid)) return;
    this.resolvingParticipantProfiles.add(uid);
    try {
      const profile = await getUserProfile(uid);
      const participant = this.state.participants.find((item) => String(item.agoraUid) === uid);
      if (profile && participant) {
        participant.uid = profile.uid;
        participant.displayName = profile.displayName;
        participant.username = profile.username;
        participant.photoURL = profile.photoURL;
        this.notify();
      }
    } finally {
      this.resolvingParticipantProfiles.delete(uid);
    }
  }

  public subscribe(listener: VoiceStateListener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  public getState(): VoiceSessionState {
    return { ...this.state };
  }

  /**
   * Request an RTC token from the secure server endpoint
   */
  private async fetchRtcToken(channelName: string): Promise<{ token: string; appId: string; channelName: string }> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be signed in to join voice.');
    }

    const idToken = await currentUser.getIdToken();

    const response = await fetch(`${VOICE_API_BASE_URL}/api/agora/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        channelName,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      throw new Error(
        `Voice token service returned an invalid response (${response.status}). ` +
        'Check that VITE_API_BASE_URL points to the deployed LIGHT API, not a web page.'
      );
    }

    if (!response.ok) {
      if (response.status === 422 || !data.configured) {
        throw new Error(
          'SERVER_NEEDS_CERTIFICATE: Agora App Certificate is not configured on the server yet. ' +
          'Please set AGORA_APP_CERTIFICATE in your environment variables to enable voice tokens.'
        );
      }
      throw new Error(String(data.error || `Voice token request failed (${response.status}).`));
    }

    if (
      !contentType.includes('application/json') ||
      typeof data.token !== 'string' ||
      typeof data.appId !== 'string' ||
      typeof data.channelName !== 'string'
    ) {
      throw new Error('Voice token service returned incomplete data. Please check the deployed API configuration.');
    }

    if (data.channelName !== channelName) {
      throw new Error('Voice token service returned a different room. Please try joining again.');
    }

    return {
      token: data.token,
      appId: data.appId || AGORA_APP_ID,
      channelName: data.channelName,
    };
  }

  /**
   * Join a group's voice room
   */
  public async joinVoiceRoom(
    channelId: string,
    groupName: string,
    userProfile: { uid: string; displayName: string; username: string; photoURL?: string | null }
  ): Promise<void> {
    if (this.state.isConnected || this.state.isConnecting) {
      await this.leaveVoiceRoom();
    }

    const agoraChannelName = await normalizeVoiceChannelName(channelId);

    this.state.isConnecting = true;
    this.state.error = null;
    this.state.channelId = channelId;
    this.state.channelName = agoraChannelName;
    this.state.groupName = groupName;
    this.notify();

    try {
      if (!this.client) {
        this.initClient();
      }

      // Fetch short-lived token from server
      const { token, appId, channelName } = await this.fetchRtcToken(agoraChannelName);

      // Join Agora RTC channel
      await this.client!.join(appId, channelName, token, userProfile.uid);

      // Create local microphone track
      try {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true, // Acoustic Echo Cancellation
          ANS: true, // Acoustic Noise Suppression
        });

        // Respect default muted state
        await this.localAudioTrack.setEnabled(!this.state.isMuted);
        if (!this.state.isMuted) {
          await this.client!.publish([this.localAudioTrack]);
        }
      } catch (micErr: any) {
        console.warn('[Agora] Microphone access warning:', micErr.message);
        // User may have denied mic or has no mic; still allow listening in deafened/listening mode
      }

      // Add self to participants
      this.state.participants = [
        {
          uid: userProfile.uid,
          agoraUid: userProfile.uid,
          displayName: userProfile.displayName,
          username: userProfile.username,
          photoURL: userProfile.photoURL,
          isMuted: this.state.isMuted,
          isDeafened: this.state.isDeafened,
          isSpeaking: false,
          audioLevel: 0,
        },
      ];

      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.error = null;
      this.notify();
    } catch (err: any) {
      console.error('[Agora] Failed to join voice room:', err);
      this.state.isConnected = false;
      this.state.isConnecting = false;
      this.state.error = err.message || 'Could not connect to voice channel.';
      this.notify();
      throw err;
    }
  }

  /**
   * Leave voice room
   */
  public async leaveVoiceRoom(): Promise<void> {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }
      if (this.client) {
        await this.client.leave();
      }
    } catch (err) {
      console.warn('[Agora] Error leaving channel:', err);
    } finally {
      this.state.isConnected = false;
      this.state.isConnecting = false;
      this.state.channelId = null;
      this.state.channelName = null;
      this.state.groupName = null;
      this.state.participants = [];
      this.state.speakingUid = null;
      this.notify();
    }
  }

  /**
   * Toggle mute microphone
   */
  public async toggleMute(): Promise<boolean> {
    const nextMuted = !this.state.isMuted;
    this.state.isMuted = nextMuted;

    try {
      if (this.localAudioTrack) {
        await this.localAudioTrack.setEnabled(!nextMuted);
        if (nextMuted) {
          if (this.client && this.client.connectionState === 'CONNECTED') {
            await this.client.unpublish([this.localAudioTrack]).catch(() => {});
          }
        } else {
          if (this.client && this.client.connectionState === 'CONNECTED') {
            await this.client.publish([this.localAudioTrack]).catch(() => {});
          }
        }
      }

      // Update self in participants
      const self = this.state.participants.find((p) => p.uid === auth.currentUser?.uid);
      if (self) self.isMuted = nextMuted;

      this.notify();
    } catch (err) {
      console.error('[Agora] Toggle mute error:', err);
    }

    return nextMuted;
  }

  /**
   * Toggle deafen (mutes incoming audio & outgoing mic)
   */
  public async toggleDeafen(): Promise<boolean> {
    const nextDeafen = !this.state.isDeafened;
    this.state.isDeafened = nextDeafen;

    if (nextDeafen && !this.state.isMuted) {
      await this.toggleMute();
    }

    // Mute/unmute all remote audio tracks
    if (this.client) {
      this.client.remoteUsers.forEach((user) => {
        if (user.audioTrack) {
          if (nextDeafen) {
            user.audioTrack.stop();
          } else {
            user.audioTrack.play();
          }
        }
      });
    }

    const self = this.state.participants.find((p) => p.uid === auth.currentUser?.uid);
    if (self) self.isDeafened = nextDeafen;

    this.notify();
    return nextDeafen;
  }

  /**
   * Get available audio input devices
   */
  public async getMicrophones() {
    return AgoraRTC.getMicrophones();
  }

  /**
   * Switch audio input device
   */
  public async setMicrophone(deviceId: string) {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setDevice(deviceId);
    }
  }
}

export const agoraVoice = new AgoraVoiceService();
