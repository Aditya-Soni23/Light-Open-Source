import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import agoraTokenPkg from 'agora-token';
import { createHash } from 'node:crypto';
const { RtcTokenBuilder, RtcRole } = agoraTokenPkg;
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MAX_SOURCE_ROOM_NAME_BYTES = 512;
const MAX_AGORA_CHANNEL_NAME_BYTES = 64;
const CHANNEL_PREFIX = 'light_';
const FINGERPRINT_HEX_LENGTH = 24;
const READABLE_PART_MAX_LENGTH =
  MAX_AGORA_CHANNEL_NAME_BYTES - CHANNEL_PREFIX.length - 1 - FINGERPRINT_HEX_LENGTH;
const CANONICAL_CHANNEL_NAME_PATTERN = new RegExp(
  `^${CHANNEL_PREFIX}[a-zA-Z0-9_-]{1,${READABLE_PART_MAX_LENGTH}}_[a-f0-9]{${FINGERPRINT_HEX_LENGTH}}$`
);

function normalizeVoiceChannelName(roomKey: string): string {
  const trimmedRoomKey = roomKey.trim();
  if (!trimmedRoomKey) {
    throw new Error('Voice room name is invalid: please choose a room with a name.');
  }

  if (Buffer.byteLength(trimmedRoomKey, 'utf8') > MAX_SOURCE_ROOM_NAME_BYTES) {
    throw new Error('Voice room name is invalid: the room name is too long. Please choose a shorter room name.');
  }

  // The desktop client submits canonical names. Keeping them unchanged makes
  // token signing and the subsequent Agora join target the exact same room.
  if (CANONICAL_CHANNEL_NAME_PATTERN.test(trimmedRoomKey)) {
    return trimmedRoomKey;
  }

  const fingerprint = createHash('sha256')
    .update(trimmedRoomKey, 'utf8')
    .digest('hex')
    .slice(0, FINGERPRINT_HEX_LENGTH);
  const readablePart = trimmedRoomKey
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, READABLE_PART_MAX_LENGTH) || 'room';
  const channelName = `${CHANNEL_PREFIX}${readablePart}_${fingerprint}`;

  if (Buffer.byteLength(channelName, 'utf8') > MAX_AGORA_CHANNEL_NAME_BYTES) {
    throw new Error('Voice room name is invalid: the room name could not be made compatible with voice chat.');
  }

  return channelName;
}

app.use(express.json());

// The packaged Tauri application is served from a webview origin, while the
// production token service is normally hosted elsewhere.  Allow that app to
// call the API (including the Authorization header used for Firebase tokens).
// Set ACCESS_CONTROL_ALLOW_ORIGIN to a specific origin when hosting a browser
// client that needs a stricter policy. No cookies are used by this API.
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ACCESS_CONTROL_ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Firebase Admin initialization (server-side authentication verification)
let firebaseAdminInitialized = false;
try {
  if (getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const options = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'light-3dc69',
      ...(serviceAccountJson ? { credential: cert(JSON.parse(serviceAccountJson)) } : {}),
    };
    initializeApp(options);
  }
  firebaseAdminInitialized = true;
  console.log('[Server] Firebase Admin initialized for project:', process.env.FIREBASE_PROJECT_ID || 'light-3dc69');
} catch (err) {
  console.warn('[Server] Firebase Admin initialization note:', err);
}

// Helper to authenticate user via Firebase ID Token
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    isGuest?: boolean;
  };
}

const authenticateFirebaseUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header. Bearer token required.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();

  try {
    if (!firebaseAdminInitialized) {
      return res.status(503).json({ error: 'Authentication service is unavailable.' });
    }

    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isGuest: decodedToken.firebase?.sign_in_provider === 'anonymous',
    };
    return next();
  } catch (error: any) {
    return res.status(401).json({ error: `Authentication failed: ${error.message}` });
  }
};

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------

// Render health check. This endpoint has no secrets and needs no authentication.
app.get('/healthz', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'light-voice-api',
  });
});

// Kept for local diagnostics and backwards compatibility.
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'light-voice-api' });
});

// Agora Configuration Status Check (Does NOT reveal secret certificate)
app.get('/api/agora/status', (_req: Request, res: Response) => {
  const appId = process.env.AGORA_APP_ID || '8c3ee7f5209846b99763087d2cab533a';
  const hasCertificate = Boolean(process.env.AGORA_APP_CERTIFICATE && process.env.AGORA_APP_CERTIFICATE.trim().length > 0);

  res.json({
    appId,
    hasCertificate,
    mode: hasCertificate ? 'secure_token' : 'pending_certificate',
    instructions: hasCertificate
      ? 'Agora App Certificate is securely configured on the server.'
      : 'Set AGORA_APP_CERTIFICATE in your server environment variables or Secrets panel to enable token signing.',
  });
});

/**
 * POST /api/agora/token
 * Generates a short-lived Agora RTC Token for voice rooms.
 * Requires Firebase ID token in Authorization header.
 * Input: { channelName: string, uid?: string }
 */
app.post('/api/agora/token', authenticateFirebaseUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userUid = req.user?.uid;
    const { channelName } = req.body;

    if (!userUid) {
      return res.status(401).json({ error: 'Unauthorized: User identity not determined.' });
    }

    if (!channelName || typeof channelName !== 'string') {
      return res.status(400).json({ error: 'Invalid channelName provided.' });
    }

    let normalizedChannelName: string;
    try {
      normalizedChannelName = normalizeVoiceChannelName(channelName);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Invalid channelName format.' });
    }

    const appId = process.env.AGORA_APP_ID || '8c3ee7f5209846b99763087d2cab533a';
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appCertificate || appCertificate.trim().length === 0) {
      return res.status(422).json({
        configured: false,
        error: 'Agora App Certificate is not configured on the server. Please set AGORA_APP_CERTIFICATE in the environment.',
        appId,
        channelName: normalizedChannelName,
        uid: userUid,
      });
    }

    // The agora-token v2 builder expects a *duration in seconds*, not an
    // absolute Unix timestamp. Passing a timestamp creates an invalid token.
    // Token expiration: 1 hour (3600 seconds).
    const expireTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Build secure token with User Account (string uid)
    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      normalizedChannelName,
      userUid,
      RtcRole.PUBLISHER,
      expireTimeInSeconds,
      expireTimeInSeconds
    );

    return res.json({
      token,
      appId,
      channelName: normalizedChannelName,
      uid: userUid,
      expiresIn: expireTimeInSeconds,
      expiresAt: currentTimestamp + expireTimeInSeconds,
    });
  } catch (error: any) {
    console.error('[Server] Token generation error:', error);
    return res.status(500).json({ error: 'Failed to generate voice room token: ' + error.message });
  }
});

function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LIGHT Voice API] Listening on port ${PORT}`);
  });
}

startServer();
