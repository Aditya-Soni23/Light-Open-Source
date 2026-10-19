import {
  ref,
  onValue,
  set,
  update,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp
} from 'firebase/database';
import { rtdb } from './firebase';
import { UserPresenceStatus } from '../types';

/**
 * Initialize online presence for the logged-in user using Firebase Realtime Database.
 */
export const setupUserPresence = (uid: string) => {
  if (!rtdb) {
    console.warn('[Presence] Realtime Database not initialized.');
    return () => {};
  }

  const userStatusDatabaseRef = ref(rtdb, `/status/${uid}`);
  const connectedRef = ref(rtdb, '.info/connected');

  const unsubscribe = onValue(
    connectedRef,
    (snapshot) => {
      if (snapshot.val() === false) {
        return;
      }

      // Set onDisconnect action in Realtime Database
      onDisconnect(userStatusDatabaseRef)
        .set({
          state: 'offline',
          last_changed: rtdbServerTimestamp(),
        })
        .then(() => {
          // Mark user online right now
          set(userStatusDatabaseRef, {
            state: 'online',
            last_changed: rtdbServerTimestamp(),
          });

          // Mirror to user profile in Realtime Database
          if (rtdb) {
            update(ref(rtdb, `users/${uid}`), {
              status: 'online',
              updatedAt: Date.now(),
            }).catch((err) => console.warn('[Presence] RTDB profile sync warning:', err));
          }
        })
        .catch((err) => {
          console.warn('[Presence] Realtime Database onDisconnect setup warning:', err);
        });
    },
    (err) => {
      console.warn('[Presence] Connection status note:', err.message);
    }
  );

  return () => {
    unsubscribe();
    // Set offline on cleanup
    set(userStatusDatabaseRef, {
      state: 'offline',
      last_changed: rtdbServerTimestamp(),
    }).catch(() => {});
  };
};

/**
 * Update current activity status (online, in-game, idle, dnd)
 */
export const updatePresenceStatus = async (
  uid: string,
  status: UserPresenceStatus,
  currentGame?: string | null
) => {
  if (!rtdb) return;

  try {
    const updates: Record<string, any> = {};
    updates[`users/${uid}/status`] = status;
    updates[`users/${uid}/currentGame`] = currentGame || null;
    updates[`users/${uid}/updatedAt`] = Date.now();
    updates[`status/${uid}/state`] = status;
    updates[`status/${uid}/currentGame`] = currentGame || null;
    updates[`status/${uid}/last_changed`] = rtdbServerTimestamp();

    await update(ref(rtdb), updates);
  } catch (e) {
    console.warn('[Presence] updatePresenceStatus error:', e);
  }
};
