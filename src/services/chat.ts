import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  onValue
} from 'firebase/database';
import { rtdb } from './firebase';
import {
  DirectConversation,
  GroupConversation,
  ChatMessage,
  UserProfile,
  GroupMember
} from '../types';

/**
 * Deterministic conversation ID for two users.
 */
export const getDirectConversationId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('__');
};

/**
 * Get or create a direct 1-to-1 conversation between two users in Realtime Database.
 */
export const getOrCreateDirectConversation = async (
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<DirectConversation> => {
  const conversationId = getDirectConversationId(currentUser.uid, otherUser.uid);
  if (!rtdb) {
    return {
      id: conversationId,
      participants: [currentUser.uid, otherUser.uid].sort() as [string, string],
      participantData: {
        [currentUser.uid]: { displayName: currentUser.displayName, username: currentUser.username, photoURL: currentUser.photoURL || null },
        [otherUser.uid]: { displayName: otherUser.displayName, username: otherUser.username, photoURL: otherUser.photoURL || null },
      },
      updatedAt: Date.now(),
    };
  }

  const convRef = ref(rtdb, `direct_conversations/${conversationId}`);
  const snap = await get(convRef);

  if (snap.exists()) {
    return snap.val() as DirectConversation;
  }

  const newConv: DirectConversation = {
    id: conversationId,
    participants: [currentUser.uid, otherUser.uid].sort() as [string, string],
    participantData: {
      [currentUser.uid]: {
        displayName: currentUser.displayName,
        username: currentUser.username,
        photoURL: currentUser.photoURL || null,
      },
      [otherUser.uid]: {
        displayName: otherUser.displayName,
        username: otherUser.username,
        photoURL: otherUser.photoURL || null,
      },
    },
    updatedAt: Date.now(),
    unreadCount: {
      [currentUser.uid]: 0,
      [otherUser.uid]: 0,
    },
  };

  await set(convRef, newConv);
  return newConv;
};

/**
 * Send a message in a direct 1:1 conversation.
 */
export const sendDirectMessage = async (
  conversationId: string,
  sender: UserProfile,
  text: string
): Promise<void> => {
  const trimmed = text.trim();
  if (!trimmed || !rtdb) return;

  const now = Date.now();
  const messagesRef = ref(rtdb, `direct_messages/${conversationId}`);
  const newMsgRef = push(messagesRef);
  const msgId = newMsgRef.key || `${now}_${Math.random()}`;

  const msgData: ChatMessage = {
    id: msgId,
    conversationId,
    senderUid: sender.uid,
    senderDisplayName: sender.displayName,
    senderUsername: sender.username,
    senderPhotoURL: sender.photoURL || null,
    text: trimmed,
    timestamp: now,
  };

  const updates: Record<string, any> = {};
  updates[`direct_messages/${conversationId}/${msgId}`] = msgData;
  updates[`direct_conversations/${conversationId}/lastMessage`] = {
    text: trimmed,
    senderUid: sender.uid,
    timestamp: now,
  };
  updates[`direct_conversations/${conversationId}/updatedAt`] = now;

  await update(ref(rtdb), updates);
};

/**
 * Subscribe to direct messages in a conversation.
 */
export const subscribeToDirectMessages = (
  conversationId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 50
) => {
  if (!rtdb) return () => {};

  const messagesRef = ref(rtdb, `direct_messages/${conversationId}`);
  const unsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      const list: ChatMessage[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          list.push(data[key] as ChatMessage);
        });
        // Sort oldest to newest
        list.sort((a, b) => a.timestamp - b.timestamp);
      }
      callback(list.slice(-messageLimit));
    },
    (err) => {
      console.warn('[Chat] Direct messages note:', err.message);
      callback([]);
    }
  );

  return () => unsubscribe();
};

/**
 * Subscribe to user's direct conversation list.
 */
export const subscribeToDirectConversations = (
  currentUid: string,
  callback: (conversations: DirectConversation[]) => void
) => {
  if (!rtdb) return () => {};

  const convsRef = ref(rtdb, 'direct_conversations');
  const unsubscribe = onValue(
    convsRef,
    (snapshot) => {
      const list: DirectConversation[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          const conv = data[key] as DirectConversation;
          if (conv.participants && Array.isArray(conv.participants) && conv.participants.includes(currentUid)) {
            list.push(conv);
          }
        });
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
      callback(list);
    },
    (err) => {
      console.warn('[Chat] Direct conversations note:', err.message);
      callback([]);
    }
  );

  return () => unsubscribe();
};

// -----------------------------------------------------------------------------
// GROUPS & GROUP MESSAGING
// -----------------------------------------------------------------------------

/**
 * Create a new group in Realtime Database.
 */
export const createGroup = async (
  owner: UserProfile,
  name: string,
  description: string = '',
  initialMembers: UserProfile[] = []
): Promise<GroupConversation> => {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Group name cannot be blank.');
  if (!rtdb) throw new Error('Realtime Database not initialized');

  const groupsRef = ref(rtdb, 'groups');
  const newGroupRef = push(groupsRef);
  const groupId = newGroupRef.key || `group_${Date.now()}`;
  const now = Date.now();

  const members: { [uid: string]: GroupMember } = {
    [owner.uid]: {
      uid: owner.uid,
      displayName: owner.displayName,
      username: owner.username,
      photoURL: owner.photoURL || null,
      role: 'owner',
      joinedAt: now,
    },
  };

  const memberUids = [owner.uid];

  initialMembers.forEach((member) => {
    if (member.uid !== owner.uid) {
      memberUids.push(member.uid);
      members[member.uid] = {
        uid: member.uid,
        displayName: member.displayName,
        username: member.username,
        photoURL: member.photoURL || null,
        role: 'member',
        joinedAt: now,
      };
    }
  });

  const groupData: GroupConversation = {
    id: groupId,
    name: trimmedName,
    description: description.trim(),
    ownerUid: owner.uid,
    memberUids,
    members,
    voiceChannelName: `light_group_${groupId}`,
    createdAt: now,
    updatedAt: now,
  };

  await set(newGroupRef, groupData);
  return groupData;
};

/**
 * Send a message to a group.
 */
export const sendGroupMessage = async (
  groupId: string,
  sender: UserProfile,
  text: string
): Promise<void> => {
  const trimmed = text.trim();
  if (!trimmed || !rtdb) return;

  const now = Date.now();
  const messagesRef = ref(rtdb, `group_messages/${groupId}`);
  const newMsgRef = push(messagesRef);
  const msgId = newMsgRef.key || `${now}_${Math.random()}`;

  const msgData: ChatMessage = {
    id: msgId,
    conversationId: groupId,
    senderUid: sender.uid,
    senderDisplayName: sender.displayName,
    senderUsername: sender.username,
    senderPhotoURL: sender.photoURL || null,
    text: trimmed,
    timestamp: now,
  };

  const updates: Record<string, any> = {};
  updates[`group_messages/${groupId}/${msgId}`] = msgData;
  updates[`groups/${groupId}/lastMessage`] = {
    text: trimmed,
    senderUid: sender.uid,
    senderName: sender.displayName,
    timestamp: now,
  };
  updates[`groups/${groupId}/updatedAt`] = now;

  await update(ref(rtdb), updates);
};

/**
 * Subscribe to group messages.
 */
export const subscribeToGroupMessages = (
  groupId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 50
) => {
  if (!rtdb) return () => {};

  const messagesRef = ref(rtdb, `group_messages/${groupId}`);
  const unsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      const list: ChatMessage[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          list.push(data[key] as ChatMessage);
        });
        list.sort((a, b) => a.timestamp - b.timestamp);
      }
      callback(list.slice(-messageLimit));
    },
    (err) => {
      console.warn('[Chat] Group messages note:', err.message);
      callback([]);
    }
  );

  return () => unsubscribe();
};

/**
 * Subscribe to groups current user belongs to.
 */
export const subscribeToUserGroups = (
  currentUid: string,
  callback: (groups: GroupConversation[]) => void
) => {
  if (!rtdb) return () => {};

  const groupsRef = ref(rtdb, 'groups');
  const unsubscribe = onValue(
    groupsRef,
    (snapshot) => {
      const list: GroupConversation[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          const group = data[key] as GroupConversation;
          if (group.memberUids && Array.isArray(group.memberUids) && group.memberUids.includes(currentUid)) {
            list.push(group);
          }
        });
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
      callback(list);
    },
    (err) => {
      console.warn('[Chat] User groups note:', err.message);
      callback([]);
    }
  );

  return () => unsubscribe();
};

/**
 * Invite user to group.
 */
export const inviteToGroup = async (
  groupId: string,
  newMember: UserProfile
): Promise<void> => {
  if (!rtdb) return;

  const groupRef = ref(rtdb, `groups/${groupId}`);
  const snap = await get(groupRef);
  if (!snap.exists()) throw new Error('Group not found');

  const group = snap.val() as GroupConversation;
  const memberUids = group.memberUids || [];
  if (memberUids.includes(newMember.uid)) {
    throw new Error('User is already in this group.');
  }

  const updatedMemberUids = [...memberUids, newMember.uid];
  const updatedMembers = {
    ...(group.members || {}),
    [newMember.uid]: {
      uid: newMember.uid,
      displayName: newMember.displayName,
      username: newMember.username,
      photoURL: newMember.photoURL || null,
      role: 'member' as const,
      joinedAt: Date.now(),
    },
  };

  await update(groupRef, {
    memberUids: updatedMemberUids,
    members: updatedMembers,
    updatedAt: Date.now(),
  });
};

/**
 * Leave group.
 */
export const leaveGroup = async (groupId: string, currentUid: string): Promise<void> => {
  if (!rtdb) return;

  const groupRef = ref(rtdb, `groups/${groupId}`);
  const snap = await get(groupRef);
  if (!snap.exists()) return;

  const group = snap.val() as GroupConversation;
  const newMemberUids = (group.memberUids || []).filter((id) => id !== currentUid);

  if (newMemberUids.length === 0) {
    await remove(groupRef);
    return;
  }

  const newMembers = { ...(group.members || {}) };
  delete newMembers[currentUid];

  let newOwner = group.ownerUid;
  if (group.ownerUid === currentUid) {
    newOwner = newMemberUids[0];
    if (newMembers[newOwner]) {
      newMembers[newOwner].role = 'owner';
    }
  }

  await update(groupRef, {
    ownerUid: newOwner,
    memberUids: newMemberUids,
    members: newMembers,
    updatedAt: Date.now(),
  });
};
