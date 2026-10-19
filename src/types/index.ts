export type UserPresenceStatus = 'online' | 'in-game' | 'idle' | 'dnd' | 'offline';

export interface UserProfile {
  uid: string;
  username: string; // unique lowercase tag (e.g., 'ghostrider')
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  bio?: string;
  status: UserPresenceStatus;
  currentGame?: string | null;
  isGuest: boolean;
  createdAt: number;
  updatedAt: number;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface FriendRequest {
  id: string;
  senderUid: string;
  senderUsername: string;
  senderDisplayName: string;
  senderPhotoURL?: string | null;
  receiverUid: string;
  receiverUsername: string;
  status: FriendRequestStatus;
  createdAt: number;
}

export interface FriendRelation {
  id: string; // e.g. `${uid1}_${uid2}`
  users: [string, string]; // sorted UIDs
  createdAt: number;
}

export interface DirectConversation {
  id: string;
  participants: [string, string]; // UIDs
  participantData: {
    [uid: string]: {
      displayName: string;
      username: string;
      photoURL?: string | null;
    };
  };
  lastMessage?: {
    text: string;
    senderUid: string;
    timestamp: number;
  };
  updatedAt: number;
  unreadCount?: {
    [uid: string]: number;
  };
}

export interface GroupMember {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string | null;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
}

export interface GroupConversation {
  id: string;
  name: string;
  description?: string;
  ownerUid: string;
  memberUids: string[];
  members: { [uid: string]: GroupMember };
  voiceChannelName: string; // e.g. `group_${id}`
  lastMessage?: {
    text: string;
    senderUid: string;
    senderName: string;
    timestamp: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  senderDisplayName: string;
  senderUsername: string;
  senderPhotoURL?: string | null;
  text: string;
  timestamp: number;
  edited?: boolean;
}

export interface VoiceParticipant {
  uid: string;
  agoraUid: number | string;
  displayName: string;
  username: string;
  photoURL?: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0 to 100
}

export interface VoiceSessionState {
  isConnected: boolean;
  isConnecting: boolean;
  channelId: string | null;
  channelName: string | null;
  groupName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  speakingUid: string | null;
  participants: VoiceParticipant[];
  error?: string | null;
}

export interface UserAppSettings {
  audioInputDeviceId: string;
  audioOutputDeviceId: string;
  inputVolume: number;
  outputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  miniAlwaysOnTop: boolean;
  miniOpacity: number; // 0.4 to 1.0
  miniScale: 'compact' | 'normal' | 'expanded';
  notificationsEnabled: boolean;
}
