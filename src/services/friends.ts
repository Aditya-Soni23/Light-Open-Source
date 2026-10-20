import {
  ref,
  get,
  update,
  remove,
  onValue,
  runTransaction
} from 'firebase/database';
import { rtdb } from './firebase';
import { FriendRequest, FriendRelation, UserProfile } from '../types';
import { getUserByUsername, getUserProfile } from './auth';

/**
 * Generate a deterministic composite ID for a pair of user IDs.
 */
export const getFriendshipPairId = (uidA: string, uidB: string): string => {
  return [uidA, uidB].sort().join('__');
};

/**
 * Send a friend request to a user by their exact unique username.
 */
export const sendFriendRequestByUsername = async (
  currentUser: UserProfile,
  targetUsername: string
): Promise<{ success: boolean; message: string }> => {
  if (!rtdb) throw new Error('Realtime Database is not connected.');

  const targetProfile = await getUserByUsername(targetUsername);

  if (!targetProfile) {
    throw new Error(`User with username "${targetUsername}" was not found.`);
  }

  if (targetProfile.uid === currentUser.uid) {
    throw new Error('You cannot send a friend request to yourself.');
  }

  // Check if they are already friends
  const pairId = getFriendshipPairId(currentUser.uid, targetProfile.uid);
  const friendSnap = await get(ref(rtdb, `friends/${pairId}`));
  if (friendSnap.exists()) {
    throw new Error(`You and ${targetProfile.displayName} are already friends.`);
  }

  // Check if there is already an active pending request between them
  const requestId1 = `${currentUser.uid}__${targetProfile.uid}`;
  // Check if target already sent a request to current user
  const requestId2 = `${targetProfile.uid}__${currentUser.uid}`;
  const req2Snap = await get(ref(rtdb, `friend_requests/${requestId2}`));
  if (req2Snap.exists() && req2Snap.val()?.status === 'pending') {
    await acceptFriendRequest(requestId2, currentUser.uid, targetProfile.uid);
    return { success: true, message: `Connected! ${targetProfile.displayName} had already invited you.` };
  }

  const now = Date.now();
  const newRequest: FriendRequest = {
    id: requestId1,
    senderUid: currentUser.uid,
    senderUsername: currentUser.username,
    senderDisplayName: currentUser.displayName,
    senderPhotoURL: currentUser.photoURL || null,
    receiverUid: targetProfile.uid,
    receiverUsername: targetProfile.username,
    status: 'pending',
    createdAt: now,
  };

  // The deterministic id plus a transaction makes repeat clicks idempotent
  // and closes the race between the pre-flight checks and the write.
  const result = await runTransaction(ref(rtdb, `friend_requests/${requestId1}`), (existing) => {
    if (existing?.status === 'pending') return;
    return newRequest;
  });
  if (!result.committed) {
    throw new Error(`You have already sent a pending friend request to ${targetProfile.displayName}.`);
  }
  return { success: true, message: `Friend request sent to @${targetProfile.username}.` };
};

/**
 * Accept an incoming friend request.
 */
export const acceptFriendRequest = async (
  requestId: string,
  currentUid: string,
  otherUid: string
): Promise<void> => {
  if (!rtdb) throw new Error('Realtime Database is not connected.');

  const requestSnapshot = await get(ref(rtdb, `friend_requests/${requestId}`));
  const request = requestSnapshot.val() as FriendRequest | null;
  if (!request || request.status !== 'pending') {
    throw new Error('This friend request is no longer pending.');
  }
  if (request.receiverUid !== currentUid || request.senderUid !== otherUid) {
    throw new Error('You can only accept a request sent to your account.');
  }

  const pairId = getFriendshipPairId(currentUid, otherUid);
  const now = Date.now();

  const updates: Record<string, any> = {};
  updates[`friends/${pairId}`] = {
    id: pairId,
    users: {
      [currentUid]: true,
      [otherUid]: true,
    },
    userList: [currentUid, otherUid],
    createdAt: now,
  };
  updates[`user_friends/${currentUid}/${otherUid}`] = true;
  updates[`user_friends/${otherUid}/${currentUid}`] = true;
  updates[`friend_requests/${requestId}`] = null;

  await update(ref(rtdb), updates);
};

/**
 * Decline an incoming friend request.
 */
export const declineFriendRequest = async (requestId: string): Promise<void> => {
  if (!rtdb) throw new Error('Realtime Database is not connected.');
  await remove(ref(rtdb, `friend_requests/${requestId}`));
};

/**
 * Cancel an outgoing friend request.
 */
export const cancelFriendRequest = async (requestId: string): Promise<void> => {
  if (!rtdb) throw new Error('Realtime Database is not connected.');
  await remove(ref(rtdb, `friend_requests/${requestId}`));
};

/**
 * Remove a friend with mutual confirmation.
 */
export const removeFriend = async (currentUid: string, friendUid: string): Promise<void> => {
  if (!rtdb) throw new Error('Realtime Database is not connected.');

  const pairId = getFriendshipPairId(currentUid, friendUid);
  const updates: Record<string, any> = {};
  updates[`friends/${pairId}`] = null;
  updates[`user_friends/${currentUid}/${friendUid}`] = null;
  updates[`user_friends/${friendUid}/${currentUid}`] = null;

  await update(ref(rtdb), updates);
};

/**
 * Subscribe to incoming friend requests.
 */
export const subscribeToIncomingRequests = (
  currentUid: string,
  callback: (requests: FriendRequest[]) => void
) => {
  if (!rtdb) return () => {};

  const requestsRef = ref(rtdb, 'friend_requests');
  const unsubscribe = onValue(
    requestsRef,
    (snapshot) => {
      const list: FriendRequest[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          const req = data[key] as FriendRequest;
          if (req && req.receiverUid === currentUid && req.status === 'pending') {
            list.push(req);
          }
        });
      }
      callback(list);
    },
    (err) => {
      console.warn('[Friends] Incoming requests note:', err.message);
      callback([]);
    }
  );

  return () => unsubscribe();
};

/**
 * Subscribe to outgoing friend requests.
 */
export const subscribeToOutgoingRequests = (
  currentUid: string,
  callback: (requests: FriendRequest[]) => void
) => {
  if (!rtdb) return () => {};

  const requestsRef = ref(rtdb, 'friend_requests');
  const unsubscribe = onValue(
    requestsRef,
    (snapshot) => {
      const list: FriendRequest[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          const req = data[key] as FriendRequest;
          if (req && req.senderUid === currentUid && req.status === 'pending') {
            list.push(req);
          }
        });
      }
      callback(list);
    },
    (err) => {
      console.warn('[Friends] Outgoing requests note:', err.message);
      callback([]);
    }
  );

  return () => unsubscribe();
};

/**
 * Subscribe to active friends list for a user.
 */
export const subscribeToFriends = (
  currentUid: string,
  callback: (friends: UserProfile[]) => void
) => {
  if (!rtdb) return () => {};

  const userFriendsRef = ref(rtdb, `user_friends/${currentUid}`);
  const unsubscribe = onValue(
    userFriendsRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const friendsMap = snapshot.val() || {};
      const friendUids = Object.keys(friendsMap);

      const profiles: UserProfile[] = [];
      for (const uid of friendUids) {
        const p = await getUserProfile(uid);
        if (p) profiles.push(p);
      }
      callback(profiles);
    },
    (err) => {
      console.warn('[Friends] Friends list note:', err.message);
      callback([]);
    }
  );

  return () => unsubscribe();
};
