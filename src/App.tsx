import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
    UserProfile,
    FriendRequest,
    GroupConversation,
    DirectConversation,
    VoiceSessionState,
} from "./types";
import {
    subscribeToAuth,
    getUserProfile,
    reserveUsernameAndSaveProfile,
    sanitizeUsername,
    waitForPendingProfileCreation,
} from "./services/auth";
import { authPersistenceReady } from "./services/firebase";
import {
    subscribeToFriends,
    subscribeToIncomingRequests,
    subscribeToOutgoingRequests,
} from "./services/friends";
import {
    subscribeToUserGroups,
    subscribeToDirectConversations,
    getOrCreateDirectConversation,
} from "./services/chat";
import { setupUserPresence } from "./services/presence";
import { agoraVoice } from "./services/agora";
import {
    getPreferences,
    applyThemeToDOM,
    subscribeToPreferences,
} from "./services/preferences";
import { desktop } from "./services/desktop";

// UI Components
import { TopHeader } from "./components/navigation/TopHeader";
import { AppSidebar, MainNavSection } from "./components/navigation/AppSidebar";
import { SubSidebar } from "./components/navigation/SubSidebar";
import { HomeView } from "./components/home/HomeView";
import { FriendsView } from "./components/friends/FriendsView";
import { DirectChatView } from "./components/chat/DirectChatView";
import { GroupChatView } from "./components/chat/GroupChatView";
import { VoiceRoomView } from "./components/voice/VoiceRoomView";
import { VoiceBar } from "./components/voice/VoiceBar";
import { LightMiniCompanion } from "./components/mini/LightMiniCompanion";
import { XtremeSmallCompanion } from "./components/mini/XtremeSmallCompanion";
import { SettingsView } from "./components/settings/SettingsView";
import { AuthModal } from "./components/auth/AuthModal";
import { LogoutConfirmModal } from "./components/auth/LogoutConfirmModal";
import { CreateGroupModal } from "./components/groups/CreateGroupModal";
import { AgoraConfigModal } from "./components/voice/AgoraConfigModal";
import { Toast } from "./components/common/Toast";
import { UpdateManager } from "./components/common/UpdateManager";
import { signOut } from "./services/auth";
import {
    ensureNotificationPermission,
    notifyMessage,
} from "./services/notifications";
import {
    notifyNewDirectMessages,
    notifyNewGroupMessages,
} from "./services/notifications";

export type AppInterfaceMode = "normal" | "companion" | "xtreme-small";

export default function App() {
    // Authentication & Profile state
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Interface Mode state (Normal | Companion Mode | Xtreme Small)
    const [interfaceMode, setInterfaceMode] =
        useState<AppInterfaceMode>("normal");

    // Social & Chat state
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>(
        [],
    );
    const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>(
        [],
    );
    const [groups, setGroups] = useState<GroupConversation[]>([]);
    const [directConversations, setDirectConversations] = useState<
        DirectConversation[]
    >([]);

    // Navigation state
    const [currentSection, setCurrentSection] =
        useState<MainNavSection>("home");
    const [activeRecipient, setActiveRecipient] = useState<UserProfile | null>(
        null,
    );
    const [activeGroup, setActiveGroup] = useState<GroupConversation | null>(
        null,
    );

    // Voice & Mini Companion state
    const [voiceState, setVoiceState] = useState<VoiceSessionState>(
        agoraVoice.getState(),
    );
    const [isMiniCompanionOpen, setIsMiniCompanionOpen] = useState(false);
    const [isVoiceRoomFullViewOpen, setIsVoiceRoomFullViewOpen] =
        useState(false);

    // Modals state
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [isAgoraConfigModalOpen, setIsAgoraConfigModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Voice's expanded room is a subview, not an app-wide overlay. Always clear
    // it when navigating so a stale room can never cover the destination page.
    const navigateToSection = (section: MainNavSection) => {
        setCurrentSection(section);
        setIsVoiceRoomFullViewOpen(false);
    };

    // Ask for notification permission once after login
    useEffect(() => {
        if (!userProfile) return;
        void ensureNotificationPermission();
    }, [userProfile?.uid]);

    useEffect(() => {
        if (!userProfile) return;

        const uid = userProfile.uid;

        // Direct conversations subscription
        const seenDm = new Map<string, string>();
        let firstDmSnapshot = true;

        const unsubConversations = subscribeToDirectConversations(
            uid,
            (data) => {
                setDirectConversations(data);

                notifyNewDirectMessages(uid, data, seenDm, firstDmSnapshot);

                firstDmSnapshot = false;
            },
        );

        // Groups subscription
        const seenGroups = new Map<string, string>();
        let firstGroupSnapshot = true;

        const unsubGroups = subscribeToUserGroups(uid, (data) => {
            setGroups(data);

            if (activeGroup) {
                const updated = data.find((g) => g.id === activeGroup.id);
                if (updated) setActiveGroup(updated);
            }

            notifyNewGroupMessages(uid, data, seenGroups, firstGroupSnapshot);

            firstGroupSnapshot = false;
        });

        return () => {
            unsubConversations();
            unsubGroups();
        };
    }, [userProfile?.uid, activeGroup?.id]);

    // Initialize and subscribe to user visual preferences & theme
    useEffect(() => {
        const prefs = getPreferences();
        applyThemeToDOM(prefs);
        const unsubPrefs = subscribeToPreferences((updated) => {
            applyThemeToDOM(updated);
        });
        return () => unsubPrefs();
    }, []);

    // Subscribe to Firebase Auth with watchdog timeout and auto-healing
    useEffect(() => {
        let isMounted = true;
        let unsubscribe = () => {};

        // Safety watchdog: ensure loading spinner never blocks the user longer than 2 seconds
        const safetyTimer = setTimeout(() => {
            if (isMounted) {
                setAuthLoading(false);
            }
        }, 2000);

        const startAuthSubscription = async () => {
            try {
                await authPersistenceReady;
            } catch (err) {
                console.warn(
                    "[App] Authentication persistence setup failed; awaiting auth state.",
                    err,
                );
            }

            if (!isMounted) return;
            unsubscribe = subscribeToAuth(async (user) => {
                if (!isMounted) return;
                console.info("[App] Applying restored Firebase session.", {
                    signedIn: Boolean(user),
                });
                setAuthUser(user);
                if (user) {
                    try {
                        let profile = await getUserProfile(user.uid);
                        // Firebase emits the auth event before the selected profile is
                        // written. Wait for that operation, rather than replacing a user's
                        // chosen name/handle with an automatic fallback.
                        if (!profile) {
                            await waitForPendingProfileCreation();
                            profile = await getUserProfile(user.uid);
                        }
                        if (!profile) {
                            // Auto-heal/generate user profile for existing auth session
                            const cleanName =
                                user.displayName ||
                                (user.isAnonymous ? "Guest Gamer" : "Gamer");
                            const cleanUsername =
                                sanitizeUsername(cleanName) || "gamer";
                            const candidate = `${cleanUsername.slice(0, 14)}_${user.uid.slice(0, 4)}`;
                            profile = await reserveUsernameAndSaveProfile(
                                user.uid,
                                candidate,
                                cleanName,
                                user.email || null,
                                user.photoURL || null,
                                user.isAnonymous,
                            );
                        }
                        if (isMounted) setUserProfile(profile);
                    } catch (err) {
                        console.warn(
                            "[App] Error retrieving profile for user:",
                            err,
                        );
                        if (isMounted) {
                            const fallback: UserProfile = {
                                uid: user.uid,
                                username: `gamer_${user.uid.slice(0, 6)}`,
                                displayName:
                                    user.displayName ||
                                    (user.isAnonymous
                                        ? "Guest Gamer"
                                        : "Gamer"),
                                email: user.email || null,
                                photoURL: user.photoURL || null,
                                status: "online",
                                currentGame: null,
                                isGuest: user.isAnonymous,
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                            };
                            setUserProfile(fallback);
                        }
                    }
                } else {
                    if (isMounted) setUserProfile(null);
                }
                if (isMounted) setAuthLoading(false);
            });
        };

        void startAuthSubscription();

        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
            unsubscribe();
        };
    }, []);

    // Real-time subscriptions when profile is loaded
    useEffect(() => {
        if (!userProfile) return;

        // Presence setup
        const cleanupPresence = setupUserPresence(userProfile.uid);

        // Friends subscription
        const unsubFriends = subscribeToFriends(userProfile.uid, (data) => {
            setFriends(data);
        });

        // Friend requests subscriptions
        const unsubIncoming = subscribeToIncomingRequests(
            userProfile.uid,
            (data) => {
                setIncomingRequests(data);
            },
        );
        const unsubOutgoing = subscribeToOutgoingRequests(
            userProfile.uid,
            (data) => {
                setOutgoingRequests(data);
            },
        );

        // Groups subscription
        const unsubGroups = subscribeToUserGroups(userProfile.uid, (data) => {
            setGroups(data);
            if (activeGroup) {
                const updated = data.find((g) => g.id === activeGroup.id);
                if (updated) setActiveGroup(updated);
            }
        });

        // Direct conversations subscription
        const unsubConversations = subscribeToDirectConversations(
            userProfile.uid,
            (data) => {
                setDirectConversations(data);
            },
        );

        return () => {
            cleanupPresence();
            unsubFriends();
            unsubIncoming();
            unsubOutgoing();
            unsubGroups();
            unsubConversations();
        };
    }, [userProfile?.uid]);

    // Voice state listener
    useEffect(() => {
        const unsubVoice = agoraVoice.subscribe((state) => {
            setVoiceState(state);
        });
        return () => unsubVoice();
    }, []);

    // Handlers
    const handleStartDirectMessage = async (recipient: UserProfile) => {
        if (!userProfile) return;
        setActiveRecipient(recipient);
        navigateToSection("messages");
        try {
            await getOrCreateDirectConversation(userProfile, recipient);
        } catch (e) {
            console.error("Error starting DM:", e);
        }
    };

    const handleSelectGroup = (group: GroupConversation) => {
        setActiveGroup(group);
        navigateToSection("groups");
    };

    const handleJoinVoiceRoom = async (
        channelId: string,
        groupName: string,
    ) => {
        if (!userProfile) return;
        try {
            await agoraVoice.joinVoiceRoom(channelId, groupName, userProfile);
            setToastMessage(`Joined voice channel: ${groupName}`);
        } catch (err: any) {
            if (
                err.message &&
                err.message.includes("SERVER_NEEDS_CERTIFICATE")
            ) {
                setIsAgoraConfigModalOpen(true);
            } else {
                setToastMessage(`Voice connection note: ${err.message}`);
            }
        }
    };

    // Mode switching handlers
    const handleOpenCompanionMode = async () => {
        if (desktop.getEnvironment().isTauri) {
            try {
                // Never leave the old, in-app overlay visible when opening the native one.
                setInterfaceMode("normal");
                setIsMiniCompanionOpen(false);
                await desktop.closeOverlay("xtreme-small");
                await desktop.openOverlay("companion");
                await desktop.hideMainWindow();
            } catch (error) {
                console.error("[App] Could not open Companion mode:", error);
                await desktop
                    .showMainWindow()
                    .catch((restoreError) =>
                        console.error(
                            "[App] Could not restore main window after Companion failure:",
                            restoreError,
                        ),
                    );
                const detail =
                    error instanceof Error ? error.message : String(error);
                setToastMessage(`Could not open Companion mode: ${detail}`);
            }
            return;
        }
        setInterfaceMode("companion");
        setIsMiniCompanionOpen(true);
    };

    const handleOpenXtremeSmall = async () => {
        if (desktop.getEnvironment().isTauri) {
            try {
                // Never leave the old, in-app overlay visible when opening the native one.
                setInterfaceMode("normal");
                setIsMiniCompanionOpen(false);
                await desktop.closeOverlay("companion");
                await desktop.openOverlay("xtreme-small");
                await desktop.hideMainWindow();
            } catch (error) {
                console.error("[App] Could not open Xtreme Small mode:", error);
                await desktop
                    .showMainWindow()
                    .catch((restoreError) =>
                        console.error(
                            "[App] Could not restore main window after Xtreme failure:",
                            restoreError,
                        ),
                    );
                const detail =
                    error instanceof Error ? error.message : String(error);
                setToastMessage(`Could not open Xtreme Small mode: ${detail}`);
            }
            return;
        }
        setInterfaceMode("xtreme-small");
        setIsMiniCompanionOpen(false);
    };

    const handleExpandToFullApp = async () => {
        await desktop.closeOverlay("companion");
        await desktop.closeOverlay("xtreme-small");
        await desktop.showMainWindow();
        setInterfaceMode("normal");
        setIsMiniCompanionOpen(false);
    };

    // Native companion windows have their own webview. Keep them in sync with
    // the Agora client that deliberately stays alive in the primary app window.
    useEffect(() => {
        if (typeof BroadcastChannel === "undefined") return;
        const channel = new BroadcastChannel("light-desktop-overlay");
        channel.postMessage({ type: "voice-state", state: voiceState });
        channel.onmessage = async (event: MessageEvent<{ type: string }>) => {
            switch (event.data.type) {
                case "overlay-ready":
                    channel.postMessage({
                        type: "voice-state",
                        state: agoraVoice.getState(),
                    });
                    break;
                case "toggle-mute":
                    await agoraVoice.toggleMute();
                    break;
                case "toggle-deafen":
                    await agoraVoice.toggleDeafen();
                    break;
                case "leave-voice":
                    await agoraVoice.leaveVoiceRoom();
                    break;
                case "open-companion":
                    await handleOpenCompanionMode();
                    break;
                case "open-xtreme-small":
                    await handleOpenXtremeSmall();
                    break;
                case "open-voice-chat":
                    navigateToSection("voice");
                    await desktop.showMainWindow();
                    break;
                case "show-main":
                    await handleExpandToFullApp();
                    break;
                case "close-overlay":
                    break;
            }
        };
        return () => channel.close();
    }, [voiceState]);

    // Compute view title
    const getViewTitle = () => {
        switch (currentSection) {
            case "home":
                return "Overview";
            case "friends":
                return "Friends";
            case "messages":
                return activeRecipient
                    ? `@${activeRecipient.username}`
                    : "Direct Messages";
            case "groups":
                return activeGroup ? `#${activeGroup.name}` : "Groups";
            case "voice":
                return "Voice Channels";
            case "settings":
                return "Settings";
            default:
                return "LIGHT";
        }
    };

    if (authLoading) {
        return (
            <div className="h-screen w-screen light-app-shell flex flex-col items-center justify-center select-none transition-colors">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
                <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
                    LIGHT by DIAMOND · Initializing
                </p>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen light-app-shell flex flex-col overflow-hidden font-sans transition-colors">
            <UpdateManager />
            {/* Auth Modal displayed whenever userProfile is not yet established */}
            <AuthModal isOpen={!userProfile} onSuccess={() => {}} />

            {userProfile && (
                <>
                    {/* Main Desktop Application Area (Normal Mode) */}
                    <div
                        className={`flex-1 flex flex-col overflow-hidden relative transition-opacity duration-200 ${
                            interfaceMode === "xtreme-small"
                                ? "opacity-20 pointer-events-none filter blur-xs"
                                : "opacity-100"
                        }`}
                    >
                        {/* Top Desktop Window Bar */}
                        <TopHeader
                            userProfile={userProfile}
                            activeViewTitle={getViewTitle()}
                            onOpenCompanionMode={handleOpenCompanionMode}
                            onOpenXtremeSmall={handleOpenXtremeSmall}
                        />

                        <div className="flex-1 flex overflow-hidden relative">
                            {/* Leftmost Icon Rail */}
                            <AppSidebar
                                currentSection={currentSection}
                                onSelectSection={(sec) => {
                                    navigateToSection(sec);
                                }}
                                userProfile={userProfile}
                                pendingRequestsCount={incomingRequests.length}
                                unreadMessagesCount={0}
                                isInVoice={voiceState.isConnected}
                                onOpenMiniCompanion={handleOpenCompanionMode}
                                onOpenXtremeSmall={handleOpenXtremeSmall}
                                onRequestLogout={() =>
                                    setIsLogoutConfirmOpen(true)
                                }
                            />

                            {/* Contextual Sub-Sidebar */}
                            {currentSection !== "settings" && (
                                <SubSidebar
                                    currentSection={currentSection}
                                    friends={friends}
                                    directConversations={directConversations}
                                    groups={groups}
                                    activeRecipient={activeRecipient}
                                    activeGroup={activeGroup}
                                    onSelectFriend={(f) => {
                                        setActiveRecipient(f);
                                        navigateToSection("messages");
                                    }}
                                    onSelectGroup={(g) => {
                                        setActiveGroup(g);
                                        navigateToSection("groups");
                                    }}
                                    onOpenCreateGroupModal={() =>
                                        setIsCreateGroupModalOpen(true)
                                    }
                                    onSelectSection={navigateToSection}
                                />
                            )}

                            {/* Central Main Viewport */}
                            <main className="flex-1 flex flex-col overflow-hidden relative light-app-shell transition-colors">
                                {currentSection === "voice" &&
                                isVoiceRoomFullViewOpen ? (
                                    <VoiceRoomView
                                        voiceState={voiceState}
                                        currentUser={userProfile}
                                        onOpenMiniCompanion={
                                            handleOpenCompanionMode
                                        }
                                        onCloseView={() =>
                                            setIsVoiceRoomFullViewOpen(false)
                                        }
                                        onShowConfigModal={() =>
                                            setIsAgoraConfigModalOpen(true)
                                        }
                                    />
                                ) : (
                                    <>
                                        {currentSection === "home" && (
                                            <HomeView
                                                currentUser={userProfile}
                                                friends={friends}
                                                groups={groups}
                                                voiceState={voiceState}
                                                onOpenCreateGroupModal={() =>
                                                    setIsCreateGroupModalOpen(
                                                        true,
                                                    )
                                                }
                                                onSelectFriend={
                                                    handleStartDirectMessage
                                                }
                                                onSelectGroup={
                                                    handleSelectGroup
                                                }
                                                onJoinVoice={
                                                    handleJoinVoiceRoom
                                                }
                                                onOpenMiniCompanion={
                                                    handleOpenCompanionMode
                                                }
                                                onOpenXtremeSmall={
                                                    handleOpenXtremeSmall
                                                }
                                                onNavigateToFriends={() =>
                                                    navigateToSection("friends")
                                                }
                                            />
                                        )}

                                        {currentSection === "friends" && (
                                            <FriendsView
                                                currentUser={userProfile}
                                                friends={friends}
                                                incomingRequests={
                                                    incomingRequests
                                                }
                                                outgoingRequests={
                                                    outgoingRequests
                                                }
                                                onStartDirectMessage={
                                                    handleStartDirectMessage
                                                }
                                                onToast={setToastMessage}
                                            />
                                        )}

                                        {currentSection === "messages" &&
                                            (activeRecipient ? (
                                                <DirectChatView
                                                    currentUser={userProfile}
                                                    recipient={activeRecipient}
                                                    onJoinVoice={
                                                        handleJoinVoiceRoom
                                                    }
                                                    onToast={setToastMessage}
                                                />
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Select a friend to
                                                        message
                                                    </p>
                                                    <p className="text-xs text-slate-500 max-w-xs">
                                                        Choose a friend from the
                                                        left sidebar or add new
                                                        friends in the Friends
                                                        tab.
                                                    </p>
                                                </div>
                                            ))}

                                        {currentSection === "groups" &&
                                            (activeGroup ? (
                                                <GroupChatView
                                                    currentUser={userProfile}
                                                    group={activeGroup}
                                                    friends={friends}
                                                    onJoinVoice={
                                                        handleJoinVoiceRoom
                                                    }
                                                    onLeaveGroupSuccess={() =>
                                                        setActiveGroup(null)
                                                    }
                                                    onToast={setToastMessage}
                                                />
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Select a squad
                                                    </p>
                                                    <p className="text-xs text-slate-500 max-w-xs mb-4">
                                                        Select a group from the
                                                        list or create a new
                                                        squad for your gaming
                                                        team.
                                                    </p>
                                                    <button
                                                        onClick={() =>
                                                            setIsCreateGroupModalOpen(
                                                                true,
                                                            )
                                                        }
                                                        className="px-4 py-2 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-colors shadow-xs"
                                                    >
                                                        Create Group
                                                    </button>
                                                </div>
                                            ))}

                                        {currentSection === "voice" && (
                                            <VoiceRoomView
                                                voiceState={voiceState}
                                                currentUser={userProfile}
                                                onOpenMiniCompanion={
                                                    handleOpenCompanionMode
                                                }
                                                onCloseView={() =>
                                                    navigateToSection("home")
                                                }
                                                onShowConfigModal={() =>
                                                    setIsAgoraConfigModalOpen(
                                                        true,
                                                    )
                                                }
                                            />
                                        )}

                                        {currentSection === "settings" && (
                                            <SettingsView
                                                currentUser={userProfile}
                                                onProfileUpdated={
                                                    setUserProfile
                                                }
                                                onRequestLogout={() =>
                                                    setIsLogoutConfirmOpen(true)
                                                }
                                                onToast={setToastMessage}
                                            />
                                        )}
                                    </>
                                )}

                                {/* Persistent Voice Control Bar at Bottom when connected */}
                                <VoiceBar
                                    voiceState={voiceState}
                                    currentUser={userProfile}
                                    onOpenMiniCompanion={
                                        handleOpenCompanionMode
                                    }
                                    onOpenXtremeSmall={handleOpenXtremeSmall}
                                    onOpenVoiceRoomView={() =>
                                        setIsVoiceRoomFullViewOpen(true)
                                    }
                                    onShowConfigModal={() =>
                                        setIsAgoraConfigModalOpen(true)
                                    }
                                />
                            </main>
                        </div>
                    </div>

                    {/* Escape banner when in Xtreme Small to return to full app */}
                    {interfaceMode === "xtreme-small" && (
                        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 light-surface light-divider border px-3.5 py-1.5 rounded-lg shadow-sm text-xs flex items-center gap-2 z-40 animate-in fade-in duration-200">
                            <span className="text-slate-600 dark:text-slate-400">
                                LIGHT in Xtreme Small
                            </span>
                            <button
                                onClick={handleExpandToFullApp}
                                className="text-accent dark:text-accent hover:underline font-medium cursor-pointer"
                            >
                                Expand to Full App
                            </button>
                        </div>
                    )}

                    {/* COMPANION MODE: Floating In-Game Companion Card */}
                    <LightMiniCompanion
                        isOpen={
                            interfaceMode === "companion" || isMiniCompanionOpen
                        }
                        onClose={() => {
                            setIsMiniCompanionOpen(false);
                            setInterfaceMode("normal");
                        }}
                        onSwitchToXtremeSmall={handleOpenXtremeSmall}
                        onExpandToFullApp={handleExpandToFullApp}
                        onOpenVoiceChat={() => {
                            navigateToSection("voice");
                        }}
                        voiceState={voiceState}
                        currentUser={userProfile}
                    />

                    {/* XTREME SMALL: Ultra-compact Floating Logo-Only Window */}
                    <XtremeSmallCompanion
                        isOpen={interfaceMode === "xtreme-small"}
                        onExpandToCompanion={handleOpenCompanionMode}
                        onExpandToFullApp={handleExpandToFullApp}
                        voiceState={voiceState}
                        currentUser={userProfile}
                    />

                    <LogoutConfirmModal
                        isOpen={isLogoutConfirmOpen}
                        onClose={() => setIsLogoutConfirmOpen(false)}
                        onConfirm={async () => {
                            await signOut();
                            setIsLogoutConfirmOpen(false);
                        }}
                    />

                    {/* Create Group Modal */}
                    <CreateGroupModal
                        isOpen={isCreateGroupModalOpen}
                        onClose={() => setIsCreateGroupModalOpen(false)}
                        currentUser={userProfile}
                        friends={friends}
                        onGroupCreated={(newGroup) => {
                            setActiveGroup(newGroup);
                            navigateToSection("groups");
                        }}
                        onToast={setToastMessage}
                    />

                    {/* Agora Server Token Configuration Guide Modal */}
                    <AgoraConfigModal
                        isOpen={isAgoraConfigModalOpen}
                        onClose={() => setIsAgoraConfigModalOpen(false)}
                    />

                    {/* Global Toast Notifications */}
                    <Toast
                        message={toastMessage}
                        onClose={() => setToastMessage(null)}
                    />
                </>
            )}
        </div>
    );
}
