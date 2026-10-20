export interface AuthDiagnosticEntry {
  timestamp: string;
  level: 'info' | 'warn';
  message: string;
  details?: Record<string, string | boolean>;
}

const STORAGE_KEY = 'light_auth_diagnostics_v1';
const CHANGE_EVENT = 'light-auth-diagnostics-changed';
const MAX_ENTRIES = 80;
const PREFIXES = ['[GoogleAuth]', '[FirebaseAuth]'];

type ConsoleMethod = (...data: unknown[]) => void;

const allowedDetailKeys = new Set([
  'backend',
  'code',
  'protocol',
  'hostname',
  'isTauri',
  'hasResult',
  'signedIn',
  'isGuest',
  'redirectError',
]);

const isAuthDiagnostic = (value: unknown): value is string =>
  typeof value === 'string' && PREFIXES.some((prefix) => value.startsWith(prefix));

const safeDetails = (value: unknown): Record<string, string | boolean> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const details: Record<string, string | boolean> = {};
  for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
    if (!allowedDetailKeys.has(key)) continue;
    if (typeof candidate === 'boolean') details[key] = candidate;
    if (typeof candidate === 'string') details[key] = candidate;
  }
  return Object.keys(details).length ? details : undefined;
};

export const getAuthDiagnostics = (): AuthDiagnosticEntry[] => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const appendAuthDiagnostic = (entry: AuthDiagnosticEntry) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...getAuthDiagnostics(), entry].slice(-MAX_ENTRIES)));
  } catch {
    // Diagnostics must never interfere with authentication if WebView storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const subscribeToAuthDiagnostics = (listener: () => void) => {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
};

/**
 * Temporarily mirrors the deliberately redacted Firebase auth lifecycle logs
 * into localStorage so they remain available after the OAuth page reloads.
 */
export const installAuthDiagnostics = () => {
  const windowWithDiagnostics = window as Window & { __lightAuthDiagnosticsInstalled?: boolean };
  if (windowWithDiagnostics.__lightAuthDiagnosticsInstalled) return;
  windowWithDiagnostics.__lightAuthDiagnosticsInstalled = true;

  (['info', 'warn'] as const).forEach((level) => {
    const original = console[level].bind(console) as ConsoleMethod;
    console[level] = (...args: unknown[]) => {
      original(...args);
      if (!isAuthDiagnostic(args[0])) return;
      appendAuthDiagnostic({
        timestamp: new Date().toISOString(),
        level,
        message: args[0],
        details: safeDetails(args[1]),
      });
    };
  });
};
