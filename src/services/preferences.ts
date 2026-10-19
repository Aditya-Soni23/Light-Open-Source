/**
 * User Preferences & Personalization Service for LIGHT by DIAMOND
 *
 * Persists visual preferences, theme settings, Companion mode layout,
 * and Xtreme Small parameters to localStorage with change notifications.
 */

export type AppTheme = 'light' | 'dark' | 'system';
export type AccentColor = 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'neutral';
export type InterfaceDensity = 'comfortable' | 'compact';
export type MotionPreference = 'normal' | 'subtle' | 'reduced';
export type XtremeSmallShape = 'square' | 'rounded' | 'circle';
export type XtremeSmallHover = 'scale' | 'outline' | 'none';
export type XtremeSmallClickAction = 'companion' | 'full';

export interface CompanionPreferences {
  layout: 'compact' | 'comfortable' | 'pill';
  opacity: number; // 40 - 100
  showAvatars: boolean;
  showConnectionStatus: boolean;
  showButtonLabels: boolean;
  alwaysOnTop: boolean;
  width: number; // 240 - 360
}

export interface XtremeSmallPreferences {
  size: number; // 40 - 96
  shape: XtremeSmallShape;
  opacity: number; // 40 - 100
  alwaysOnTop: boolean;
  hoverEffect: XtremeSmallHover;
  clickBehavior: XtremeSmallClickAction;
  position: { x: number; y: number };
}

export interface UserPersonalizationSettings {
  theme: AppTheme;
  accent: AccentColor;
  density: InterfaceDensity;
  motion: MotionPreference;
  sidebarLabels: boolean;
  companion: CompanionPreferences;
  xtremeSmall: XtremeSmallPreferences;
}

const STORAGE_KEY = 'light_app_personalization_v2';

export const DEFAULT_PREFERENCES: UserPersonalizationSettings = {
  theme: 'light',
  accent: 'blue',
  density: 'comfortable',
  motion: 'normal',
  sidebarLabels: false,
  companion: {
    layout: 'compact',
    opacity: 92,
    showAvatars: true,
    showConnectionStatus: true,
    showButtonLabels: true,
    alwaysOnTop: true,
    width: 280,
  },
  xtremeSmall: {
    size: 56,
    shape: 'rounded',
    opacity: 95,
    alwaysOnTop: true,
    hoverEffect: 'scale',
    clickBehavior: 'companion',
    position: { x: 28, y: 72 },
  },
};

type Listener = (prefs: UserPersonalizationSettings) => void;
const listeners = new Set<Listener>();

export const getPreferences = (): UserPersonalizationSettings => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      companion: {
        ...DEFAULT_PREFERENCES.companion,
        ...(parsed.companion || {}),
      },
      xtremeSmall: {
        ...DEFAULT_PREFERENCES.xtremeSmall,
        ...(parsed.xtremeSmall || {}),
      },
    };
  } catch (e) {
    console.warn('[Preferences] Failed to load preferences from storage:', e);
    return DEFAULT_PREFERENCES;
  }
};

export const savePreferences = (prefs: UserPersonalizationSettings): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    applyThemeToDOM(prefs);
    listeners.forEach((fn) => fn(prefs));
  } catch (e) {
    console.error('[Preferences] Failed to save preferences:', e);
  }
};

export const updatePreferences = (
  updater: Partial<UserPersonalizationSettings> | ((prev: UserPersonalizationSettings) => UserPersonalizationSettings)
): UserPersonalizationSettings => {
  const current = getPreferences();
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  savePreferences(next);
  return next;
};

export const resetPreferences = (): UserPersonalizationSettings => {
  savePreferences(DEFAULT_PREFERENCES);
  return DEFAULT_PREFERENCES;
};

export const subscribeToPreferences = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Apply the theme tokens, accent classes, and root CSS variables to <html> and <body>.
 */
export const applyThemeToDOM = (prefs: UserPersonalizationSettings): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isSystemDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const effectiveTheme =
    prefs.theme === 'system' ? (isSystemDark ? 'dark' : 'light') : prefs.theme;

  // Toggle .dark class
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }

  // Accent attribute
  root.setAttribute('data-accent', prefs.accent);
  root.setAttribute('data-density', prefs.density);
  root.setAttribute('data-motion', prefs.motion);
};

// System color-scheme watcher
if (typeof window !== 'undefined' && window.matchMedia) {
  try {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      const current = getPreferences();
      if (current.theme === 'system') {
        applyThemeToDOM(current);
        listeners.forEach((fn) => fn(current));
      }
    });
  } catch (e) {
    // Media query listener not supported
  }
}
