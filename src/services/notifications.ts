import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from "@tauri-apps/plugin-notification";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { desktop } from "./desktop";
import type { DirectConversation, GroupConversation } from "../types";

export async function ensureNotificationPermission(): Promise<boolean> {
    if (!desktop.getEnvironment().isTauri) return false;
    try {
        if (await isPermissionGranted()) return true;
        return (await requestPermission()) === "granted";
    } catch (err) {
        console.warn("[notifications] permission check failed:", err);
        return false;
    }
}

export async function notifyMessage(
    title: string,
    body: string,
    opts: { force?: boolean } = {},
) {
    if (!desktop.getEnvironment().isTauri) return;
    try {
        const win = getCurrentWindow();
        const looking = (await win.isFocused()) && (await win.isVisible());
        if (looking && !opts.force) return;

        if (!(await ensureNotificationPermission())) return;
        sendNotification({ title, body });
    } catch (err) {
        console.warn("[notifications] send failed:", err);
    }
}

function truncate(text: string, max = 120) {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function notifyNewDirectMessages(
    myUid: string,
    conversations: DirectConversation[],
    seen: Map<string, string>,
    isFirstSnapshot: boolean,
) {
    for (const convo of conversations) {
        const last = convo.lastMessage;
        if (!last) continue;

        const signature = `${last.senderUid}|${last.timestamp}|${last.text.length}`;
        const prev = seen.get(convo.id);
        seen.set(convo.id, signature);

        if (isFirstSnapshot) continue;
        if (prev === signature) continue;        
        if (last.senderUid === myUid) continue;  

        const sender = convo.participantData?.[last.senderUid];
        void notifyMessage(
            sender?.displayName || "New message",
            truncate(last.text),
        );
    }
}

export function notifyNewGroupMessages(
    myUid: string,
    groups: GroupConversation[],
    seen: Map<string, string>,
    isFirstSnapshot: boolean,
) {
    for (const group of groups) {
        const last = group.lastMessage;
        if (!last) continue;


        const signature = `${last.senderUid}|${last.timestamp}|${last.text.length}`;
        const prev = seen.get(group.id) ?? "";
        seen.set(group.id, signature);

        if (isFirstSnapshot) continue;
        if (prev === signature) continue;
        if (last.senderUid === myUid) continue;

        void notifyMessage(
            `${last.senderName || "Someone"} in #${group.name}`,
            truncate(last.text),
        );
    }
}
