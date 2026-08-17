/**
 * Background service worker: the only place that acts.
 *
 * On "ad started" it mutes the tab with the browser's own tab-mute API
 * (the same control as the speaker icon on the tab strip); on "ad ended"
 * it unmutes — but only if we were the ones who muted. A tab the user
 * muted personally is never touched.
 *
 * Per-tab bookkeeping lives in `storage.session`, which survives service
 * worker suspensions (MV3 workers stop after ~30s idle) and is wiped when
 * the browser exits — exactly the lifetime of a tab mute.
 */
import { api } from "../shared/api.js";
import type { Message, StatusReply } from "../shared/messages.js";
import { getSettings, onSettingsChanged } from "../shared/settings.js";

const BADGE_TEXT = "AD";
const BADGE_COLOR = "#b91c1c";

const recordKey = (tabId: number): string => `mutedTab:${tabId}`;

async function wasMutedByUs(tabId: number): Promise<boolean> {
  const stored = await api.storage.session.get(recordKey(tabId));
  return stored[recordKey(tabId)] === true;
}

async function onAdStarted(tabId: number): Promise<void> {
  const tab = await api.tabs.get(tabId);
  // Already muted (by the user, another extension, or us after a missed
  // cleanup): don't stack a claim on top of someone else's mute.
  if (tab.mutedInfo?.muted === true) return;

  await api.tabs.update(tabId, { muted: true });
  await api.storage.session.set({ [recordKey(tabId)]: true });
  await api.action.setBadgeText({ tabId, text: BADGE_TEXT });
}

async function onAdEnded(tabId: number): Promise<void> {
  if (!(await wasMutedByUs(tabId))) return;
  await api.storage.session.remove(recordKey(tabId));
  await api.tabs.update(tabId, { muted: false });
  await api.action.setBadgeText({ tabId, text: "" });
}

async function handleAdState(tabId: number, inAd: boolean): Promise<void> {
  if (!(await getSettings()).enabled) return;
  await (inAd ? onAdStarted(tabId) : onAdEnded(tabId));
}

async function buildStatus(tabId: number | null): Promise<StatusReply> {
  return {
    enabled: (await getSettings()).enabled,
    mutedByUs: tabId !== null && (await wasMutedByUs(tabId)),
  };
}

/** Release every mute we hold (used when the user switches the extension off). */
async function releaseAllMutes(): Promise<void> {
  const stored = await api.storage.session.get(null);
  const tabIds = Object.keys(stored)
    .filter((key) => key.startsWith("mutedTab:") && stored[key] === true)
    .map((key) => Number(key.slice("mutedTab:".length)));
  await Promise.all(
    tabIds.map((tabId) => onAdEnded(tabId).catch(() => undefined)),
  );
}

api.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse): boolean | undefined => {
    if (message.kind === "ad-state") {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        void handleAdState(tabId, message.inAd).catch(() => undefined);
      }
      return undefined;
    }
    if (message.kind === "get-status") {
      void buildStatus(message.tabId).then(sendResponse);
      return true; // reply is async
    }
    return undefined;
  },
);

// Closing a tab retires its bookkeeping.
api.tabs.onRemoved.addListener((tabId) => {
  void api.storage.session.remove(recordKey(tabId));
});

// Switching the extension off releases any mute it holds, immediately.
onSettingsChanged((settings) => {
  if (!settings.enabled) void releaseAllMutes();
});

void api.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
