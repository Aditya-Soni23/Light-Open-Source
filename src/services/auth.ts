import {
  signInAnonymously,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  User
} from 'firebase/auth';
import {
  ref,
  get,
  set,
  update,
  remove,
  runTransaction
} from 'firebase/database';
import { auth, authPersistenceReady, rtdb } from './firebase';
import { UserProfile } from '../types';

const getAuthRuntime = () => ({
  protocol: typeof window === 'undefined' ? 'unknown' : window.location.protocol,
  hostname: typeof window === 'undefined' ? 'unknown' : window.location.hostname,
  isTauri: typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__),
});

let profileCreationInProgress: Promise<void> | null = null;

/**
 * Wait for a sign-in operation that is still writing its profile. Firebase
 * emits `onAuthStateChanged` before that write completes, so consumers must
 * not manufacture a fallback profile in the middle of the operation.
 */
export const waitForPendingProfileCreation = async (): Promise<void> => {
  const pending = profileCreationInProgress;
  if (pending) await pending;
};

/**
 * Clean & validate username format:
 * 3-20 characters, lowercase letters, numbers, and underscores only.
 */
export const sanitizeUsername = (raw: string): string => {
  return raw.toLowerCase().trim().replace(/[^a-z0-9_]/g, '').slice(0, 20);
};


export const isValidUsername = (username: string): boolean => {
  return /^[a-z0-9_]{3,20}$/.test(username);
};

/**
 * Check if a username is already claimed in the Realtime Database.
 */
export const isUsernameAvailable = async (username: string, currentUid?: string): Promise<boolean> => {
  const sanitized = sanitizeUsername(username);
  if (!isValidUsername(sanitized)) return false;
  if (!rtdb) return true;

  try {
    const usernameRef = ref(rtdb, `usernames/${sanitized}`);
    const fetchPromise = get(usernameRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
    const snap: any = await Promise.race([fetchPromise, timeoutPromise]);
    if (!snap || !snap.exists || !snap.exists()) return true;
    const data = snap.val();
    return data?.uid === currentUid;
  } catch (err) {
    console.warn('[RTDB Auth] isUsernameAvailable check fallback:', err);
    return true;
  }
};

/**
 * Reserve username and update user profile in Realtime Database.
 */
export const reserveUsernameAndSaveProfile = async (
  uid: string,
  username: string,
  displayName: string,
  email?: string | null,
  photoURL?: string | null,
  isGuest: boolean = false
): Promise<UserProfile> => {
  const cleanUsername = sanitizeUsername(username);
  if (!isValidUsername(cleanUsername)) {
    throw new Error('Username must be 3-20 characters using letters, numbers, and underscores.');
  }

  const now = Date.now();
  let existingProfile: UserProfile | null = null;

  if (rtdb) {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      const userSnap = await get(userRef);
      if (userSnap.exists()) {
        existingProfile = userSnap.val() as UserProfile;
        // Release old username if it was changed
        if (existingProfile.username && existingProfile.username !== cleanUsername) {
          await remove(ref(rtdb, `usernames/${existingProfile.username}`));
        }
      }

      // Check username reservation
      const usernameRef = ref(rtdb, `usernames/${cleanUsername}`);
      const uSnap = await get(usernameRef);
      if (uSnap.exists() && uSnap.val()?.uid !== uid) {
        throw new Error(`Username "${cleanUsername}" is already taken. Please choose another.`);
      }

      const profileData: UserProfile = {
        uid,
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        email: email || null,
        photoURL: photoURL || null,
        status: 'online',
        currentGame: existingProfile?.currentGame || null,
        isGuest,
        createdAt: existingProfile?.createdAt || now,
        updatedAt: now,
      };

      await set(usernameRef, { uid, username: cleanUsername, reservedAt: now });
      await set(userRef, profileData);

      localStorage.setItem(`light_profile_${uid}`, JSON.stringify(profileData));
      return profileData;
    } catch (err: any) {
      console.warn('[RTDB Auth] Profile save error, caching locally:', err.message);
      if (err.message && err.message.includes('already taken')) {
        throw err;
      }
    }
  }

  // Fallback profile
  const fallbackProfile: UserProfile = {
    uid,
    username: cleanUsername,
    displayName: displayName.trim() || cleanUsername,
    email: email || null,
    photoURL: photoURL || null,
    status: 'online',
    currentGame: null,
    isGuest,
    createdAt: now,
    updatedAt: now,
  };
  localStorage.setItem(`light_profile_${uid}`, JSON.stringify(fallbackProfile));
  return fallbackProfile;
};

/**
 * Fetch profile for a user ID from Realtime Database.
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (rtdb) {
    try {
      const userRef = ref(rtdb, `users/${uid}`);
      const fetchPromise = get(userRef);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
      const snap: any = await Promise.race([fetchPromise, timeoutPromise]);
      if (snap && typeof snap.exists === 'function' && snap.exists()) {
        const val = snap.val() as UserProfile;
        localStorage.setItem(`light_profile_${uid}`, JSON.stringify(val));
        return val;
      }
    } catch (err: any) {
      console.warn('[RTDB Auth] getUserProfile read note:', err.message);
    }
  }

  // Check local session cache
  const cached = localStorage.getItem(`light_profile_${uid}`);
  if (cached) {
    try {
      return JSON.parse(cached) as UserProfile;
    } catch (e) {}
  }
  return null;
};

/**
 * Look up a user profile by exact username.
 */
export const getUserByUsername = async (username: string): Promise<UserProfile | null> => {
  const cleanUsername = sanitizeUsername(username);
  if (!rtdb) return null;

  try {
    const usernameRef = ref(rtdb, `usernames/${cleanUsername}`);
    const snap = await get(usernameRef);
    if (!snap.exists()) return null;
    const uid = snap.val()?.uid;
    if (!uid) return null;
    return getUserProfile(uid);
  } catch (err) {
    // A permission/network failure is not an unknown username. Preserve it so
    // the caller can present a meaningful error instead of a false "not found".
    console.warn('[RTDB Auth] getUserByUsername error:', err);
    throw err;
  }
};

export const signInAsGuest = async (
  desiredDisplayName: string,
  desiredUsername?: string
): Promise<{ user: User; profile: UserProfile }> => {
  const cleanName = desiredDisplayName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
  const baseUsername = sanitizeUsername(desiredUsername || cleanName) || 'guest';
  const candidate = desiredUsername
    ? sanitizeUsername(desiredUsername)
    : `${baseUsername.slice(0, 14)}_${Math.floor(100 + Math.random() * 900)}`;

  if (!isValidUsername(candidate)) {
    throw new Error('Username must be 3-20 characters using letters, numbers, and underscores.');
  }

  await authPersistenceReady;
  let finishProfileCreation!: () => void;
  profileCreationInProgress = new Promise((resolve) => {
    finishProfileCreation = resolve;
  });
  let createdUser: User | null = null;
  try {
    const result = await signInAnonymously(auth);
    createdUser = result.user;
    const user = result.user;

    // Store the requested display name on the Firebase user as well. This
    // prevents an auth-state refresh from replacing it with a random fallback.
    await updateProfile(user, { displayName: cleanName });

    const profile = await reserveUsernameAndSaveProfile(
      user.uid,
      candidate,
      cleanName,
      null,
      null,
      true
    );

    return { user, profile };
  } catch (error) {
    // Do not leave a half-created anonymous session that the app would turn
    // into a generated guest account after the user chose a custom handle.
    await createdUser?.delete().catch(() => undefined);
    if (auth.currentUser?.isAnonymous) {
      await firebaseSignOut(auth).catch(() => undefined);
    }
    throw error;
  } finally {
    finishProfileCreation();
    profileCreationInProgress = null;
  }
};

/**
 * Sign Out
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[Auth] Sign out note:', err);
    throw new Error('LIGHT could not log you out. Please check your connection and try again.');
  }
};

/**
 * Subscribe to Auth State
 */
export const subscribeToAuth = (
  callback: (user: User | null) => void
) => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    console.info('[FirebaseAuth] Auth state changed.', {
      signedIn: Boolean(user),
      isGuest: Boolean(user?.isAnonymous),
      ...getAuthRuntime(),
    });
    callback(user);
  });

  const unsubscribeToken = onIdTokenChanged(auth, (user) => {
    console.info('[FirebaseAuth] ID token state changed.', {
      signedIn: Boolean(user),
      isGuest: Boolean(user?.isAnonymous),
      ...getAuthRuntime(),
    });
  });

  return () => {
    unsubscribeAuth();
    unsubscribeToken();
  };
};
