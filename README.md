# LIGHT by DIAMOND
> **Your friends. Your game. One click away.**

LIGHT is a high-performance gaming communication companion under the parent brand **DIAMOND**. It combines persistent direct messages, friend discovery with unique usernames, squad channels, real-time Agora voice rooms, and the signature **LIGHT MINI** floating in-game companion.

---

## 1. Quick Start & Run Instructions

```bash
# 1. Install dependencies
npm install

# 2. Start the app locally (Express API + Vite client on port 3000)
npm run dev

# Browser test option: run the same app and open the shown localhost URL
npm run web:dev

# 3. Build for production
npm run build

# 4. Serve the production build
npm start
```

`npm run web:dev` is the browser testing option. Open the local URL printed by
the command (normally `http://localhost:3000`) in Chrome, Edge, or Firefox.
Companion and Xtreme Small run as in-page overlays there; the packaged app uses
separate native windows for those same modes.

Google sign-in and guest-account linking are temporarily unavailable in the
client release while the desktop redirect flow is being finalized. Guest login
remains fully supported.

---

## 2. Logo Placement Instructions (`logo.png`)

The application logo is bundled from `src/components/brand/logo.png` by `BrandLogo.tsx`.

- **Replace it:** overwrite that file with a PNG using the same filename.
- **No config is needed:** Vite fingerprints the image automatically in production.
- **Centralized:** headers, modals, preferences, and both companion modes reference `<BrandLogo />`, so the image changes everywhere at once.

---

## 3. Technology Stack & Directory Structure

```
├── public/
│   ├── logo.png                <-- Put your custom logo here
│   └── LOGO_INSTRUCTIONS.txt
├── src/
│   ├── components/
│   │   ├── brand/
│   │   │   └── BrandLogo.tsx         # Centralized logo loader with dev fallback
│   │   ├── auth/
│   │   │   ├── AuthModal.tsx         # Google auth + Anonymous guest login
│   │   │   └── GuestUpgradeModal.tsx # Guest account upgrade to permanent Google account
│   │   ├── navigation/
│   │   │   ├── TopHeader.tsx         # Desktop title bar with game status & window controls
│   │   │   ├── AppSidebar.tsx        # Left icon rail (Home, Friends, Messages, Groups, Voice, Settings)
│   │   │   └── SubSidebar.tsx        # Contextual conversations & friends roster
│   │   ├── friends/
│   │   │   ├── FriendsView.tsx       # Online/All/Pending tabs, remove friend confirmation
│   │   │   └── AddFriendModal.tsx    # Exact username search & friend request dispatch
│   │   ├── chat/
│   │   │   ├── DirectChatView.tsx    # 1-to-1 persistent direct messages
│   │   │   └── GroupChatView.tsx     # Squad chat with member roster & 1-click voice
│   │   ├── groups/
│   │   │   └── CreateGroupModal.tsx  # Squad creation with multi-friend selection
│   │   ├── voice/
│   │   │   ├── VoiceBar.tsx          # Persistent docked voice control panel
│   │   │   ├── VoiceRoomView.tsx     # Full grid with volume meters & device picker
│   │   │   └── AgoraConfigModal.tsx  # Agora server certificate instructions modal
│   │   ├── mini/
│   │   │   └── LightMiniCompanion.tsx# The signature floating in-game overlay
│   │   ├── settings/
│   │   │   └── SettingsView.tsx      # Profile, audio sensitivity test, Tauri packaging guide
│   │   └── common/
│   │       ├── Avatar.tsx            # Presence status & speaking ring avatar
│   │       └── Toast.tsx             # Scannable notifications
│   ├── services/
│   │   ├── firebase.ts               # Firebase Auth, Firestore, RTDB, Storage singleton
│   │   ├── auth.ts                   # Google & Anonymous Auth, unique username reservation
│   │   ├── friends.ts                # Friendship requests, acceptance, and queries
│   │   ├── chat.ts                   # Firestore direct & group chat subscriptions
│   │   ├── presence.ts               # RTDB onDisconnect handlers & Firestore presence sync
│   │   ├── agora.ts                  # Agora RTC client wrapper (mute, deafen, volume indicator)
│   │   └── desktop.ts                # Tauri 2 native desktop bridge abstraction
│   ├── types/
│   │   └── index.ts                  # Strong TypeScript definitions
│   ├── App.tsx                       # Root coordinating application
│   ├── main.tsx                      # React DOM mount
│   └── index.css                     # Dark-first styles, Plus Jakarta Sans, scrollbars
├── server.ts                         # Express server with /api/agora/token & Vite middleware
├── firestore.rules                   # Production Firestore security rules
├── firestore.indexes.json            # Composite indexes for queries
├── database.rules.json               # Realtime Database presence rules
├── storage.rules                     # Avatar asset storage rules
├── firebase.json                     # Firebase deployment configuration
└── .env.example                      # Environment variables template
```

---

## 4. Firebase Configuration Steps

1. **Authentication:**
   - In [Firebase Console > Authentication](https://console.firebase.google.com/project/light-3dc69/authentication):
     - Enable **Google Provider**.
     - Enable **Anonymous Provider** (toggle Enable).
     - Under **Settings > Authorized domains**, add `ais-dev-lmb2wn553hzsgslksxsrkd-916863931728.asia-southeast1.run.app`.

2. **Realtime Database (Primary Database):**
   - LIGHT uses Firebase Realtime Database for all profiles, friends, friend requests, squad groups, direct messaging, and presence.
   - In [Firebase Console > Realtime Database](https://console.firebase.google.com/project/light-3dc69/database):
     - If not created yet, click **Create database** (choose closest region).
     - Under the **Rules** tab, paste the rules from `database.rules.json` and click **Publish**.

3. **Storage (Avatars):**
   - Enable Firebase Storage and paste `storage.rules`.

---

## 5. Agora RTC Voice Configuration (Server Secrets)

- **Agora App ID:** `8c3ee7f5209846b99763087d2cab533a` (already preconfigured).
- **Agora App Certificate:** As mandated by the security specification, the App Certificate must **never** be exposed in the frontend client.
- **Server Endpoint:** `POST /api/agora/token` verifies the user's Firebase token and signs a short-lived Agora RTC token using the server environment variable:
  ```env
  AGORA_APP_CERTIFICATE="your_primary_certificate_from_agora_console"
  ```
- **How to retrieve your certificate:**
  1. Open [console.agora.io](https://console.agora.io).
  2. Navigate to **Project Management** -> Select project `8c3ee7f5209846b99763087d2cab533a`.
  3. Under **Security**, enable **Primary Certificate** and copy the string.
  4. Set `AGORA_APP_CERTIFICATE` in your server environment variables.

---

## 6. Packaging as Windows Desktop App (Tauri 2)

LIGHT includes a native Tauri 2 shell with a LIGHT tray icon. Closing the window hides it to the system tray; left-click the tray icon or choose **Open LIGHT** to restore it, and choose **Quit LIGHT** to exit fully.

For desktop development:
```bash
# If a fresh npm install reports the existing Vite/esbuild peer conflict:
npm install --legacy-peer-deps

# Run the app as a native window with its tray icon
npm run desktop:dev
```

To create the Windows installer:
```bash
npm run desktop:build
```

### Signed auto-updates (GitHub Releases)

LIGHT uses Tauri's signed updater and checks the `latest.json` asset attached
to the latest GitHub release for `Aditya-Soni23/light-voice-api`. Before the
first release, generate an updater key pair locally in PowerShell:

```powershell
npm run tauri signer generate -- -w "$env:USERPROFILE\.tauri\light-updater.key"
```

Keep `light-updater.key` outside this repository and backed up in secure
secret storage. Copy the generated public key text into
`src-tauri/tauri.conf.json` at `plugins.updater.pubkey`, replacing the explicit
placeholder. The public key is safe to commit; the private key and its password
are not.

For a release build, provide the private key only to the build environment
(not `.env`, not `VITE_*`):

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "$env:USERPROFILE\.tauri\light-updater.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "your-key-password"
npm run desktop:build
```

Upload the generated NSIS updater installer, its `.sig` file, and a
`latest.json` manifest to the GitHub Release. The manifest must reference the
installer URL and contain the exact contents of its `.sig` file for
`windows-x86_64`. Do not publish an unsigned updater artifact.

Tauri updater signing proves that an update was signed by the private key whose
public half is embedded in LIGHT. Windows Authenticode signing is separate: it
uses a Windows code-signing certificate to establish publisher reputation and
reduce SmartScreen warnings. Authenticode does not replace Tauri updater
signatures, and a Tauri updater key does not Authenticode-sign the installer.

The installer is written to:
```
src-tauri/target/release/bundle/nsis/LIGHT_0.1.0_x64-setup.exe
```

Before making a release build, deploy the Express token server (the service exposing `/api/agora/token`) over HTTPS and set its public origin in the build environment:
```env
VITE_API_BASE_URL="https://your-light-api.example.com"
```
The Agora certificate remains only on that server as `AGORA_APP_CERTIFICATE`; never add it to a `VITE_` variable. Without this URL, browser development continues to use the local Express server, but a packaged desktop app cannot issue secure Agora voice tokens.

The token server also needs Firebase Admin credentials so that it can verify each caller's Firebase ID token. Set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file (or provide equivalent Google Application Default Credentials) on the server. Never ship that JSON file or the Agora certificate with the desktop application.

Desktop release checklist:

1. In Firebase Authentication, verify the desktop webview's displayed hostname is allowed if Google sign-in reports an unauthorized-domain error.
2. Run `npm run desktop:dev`, then test Google sign-in, guest sign-in, microphone permission, tray restore, and Close → hide-to-tray.
3. Run `npm run desktop:build` and install the generated setup executable on a clean Windows profile.

# Build Windows executable with native Always-on-Top & system tray
npx tauri build
```
