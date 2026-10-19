import {
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  linkWithPopup,
  linkWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
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
import { auth, googleAuthProvider, rtdb } from './firebase';
import { UserProfile } from '../types';

const isNativeDesktop = () =>
  typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);

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
    console.warn('[RTDB Auth] getUserByUsername error:', err);
    return null;
  }
};

/**
 * Sign in with Google Popup.
 */
export const signInWithGoogle = async (): Promise<{ user: User; profile: UserProfile | null }> => {
  // WebView2 blocks popup creation in packaged apps. Redirect is Firebase's
  // supported non-popup flow and returns to this app after Google sign-in.
  if (isNativeDesktop()) {
    await signInWithRedirect(auth, googleAuthProvider);
    return new Promise<never>(() => {});
  }

  const result = await signInWithPopup(auth, googleAuthProvider);
  const user = result.user;
  let profile = await getUserProfile(user.uid);

  if (!profile) {
    const rawName = user.displayName || user.email?.split('@')[0] || 'gamer';
    let baseUsername = sanitizeUsername(rawName) || 'gamer';
    if (baseUsername.length < 3) baseUsername = `${baseUsername}player`;
    let candidate = baseUsername.slice(0, 15);

    const available = await isUsernameAvailable(candidate);
    if (!available) {
      candidate = `${candidate.slice(0, 14)}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    profile = await reserveUsernameAndSaveProfile(
      user.uid,
      candidate,
      user.displayName || 'Gamer',
      user.email,
      user.photoURL,
      false
    );
  }

  return { user, profile };
};

export const signInAsGuest = async (
  desiredDisplayName: string,
  desiredUsername?: string
): Promise<{ user: User; profile: UserProfile }> => {
  const result = await signInAnonymously(auth);
  const user = result.user;

  const cleanName = desiredDisplayName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
  const baseUsername = sanitizeUsername(desiredUsername || cleanName) || 'guest';
  let candidate = desiredUsername
    ? sanitizeUsername(desiredUsername)
    : `${baseUsername.slice(0, 14)}_${Math.floor(100 + Math.random() * 900)}`;

  const profile = await reserveUsernameAndSaveProfile(
    user.uid,
    candidate,
    cleanName,
    null,
    null,
    true
  );

  return { user, profile };
};

/**
 * Upgrade Guest account to Google account without losing profile data.
 */
export const linkGuestToGoogle = async (currentUser: User): Promise<UserProfile> => {
  if (isNativeDesktop()) {
    await linkWithRedirect(currentUser, googleAuthProvider);
    return new Promise<never>(() => {});
  }

  const result = await linkWithPopup(currentUser, googleAuthProvider);
  const upgradedUser = result.user;

  if (rtdb) {
    const userRef = ref(rtdb, `users/${upgradedUser.uid}`);
    await update(userRef, {
      email: upgradedUser.email || null,
      isGuest: false,
      updatedAt: Date.now(),
    });
  }

  const updatedProfile = await getUserProfile(upgradedUser.uid);
  if (!updatedProfile) throw new Error('Failed to retrieve updated profile');
  return updatedProfile;
};

/**
 * Sign Out
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[Auth] Sign out note:', err);
  }
};

/**
 * Subscribe to Auth State
 */
export const subscribeToAuth = (
  callback: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};
