/**
 * Popup: shows the current state and hosts the two settings.
 * All state lives in the background worker and storage; the popup is a view.
 */
import { api } from "../shared/api.js";
import type { GetStatusMessage, StatusReply } from "../shared/messages.js";
import { getSettings, setSetting } from "../shared/settings.js";

const enabledToggle = document.querySelector<HTMLInputElement>("#enabled");
const blurToggle = document.querySelector<HTMLInputElement>("#blur");
const chimeToggle = document.querySelector<HTMLInputElement>("#chime");
const status = document.querySelector<HTMLParagraphElement>("#status");
const sitesLink = document.querySelector<HTMLButtonElement>("#sites");
if (
  enabledToggle === null ||
  blurToggle === null ||
  chimeToggle === null ||
  status === null ||
  sitesLink === null
) {
  throw new Error("popup markup missing");
}

async function activeTabId(): Promise<number | null> {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

async function render(): Promise<void> {
  const message: GetStatusMessage = {
    kind: "get-status",
    tabId: await activeTabId(),
  };
  const [settings, reply] = await Promise.all([
    getSettings(),
    api.runtime.sendMessage(message) as Promise<StatusReply>,
  ]);

  enabledToggle!.checked = settings.enabled;
  blurToggle!.checked = settings.blurAds;
  chimeToggle!.checked = settings.chimeOnSkip;
  if (!settings.enabled) {
    status!.textContent = "Off — ads play at full volume.";
    status!.className = "status";
  } else if (reply.mutedByUs) {
    status!.textContent = "Ad break — tab muted.";
    status!.className = "status muting";
  } else {
    status!.textContent = "Ready. Your music is untouched.";
    status!.className = "status";
  }
}

enabledToggle.addEventListener("change", () => {
  void setSetting("enabled", enabledToggle!.checked).then(render);
});
blurToggle.addEventListener("change", () => {
  void setSetting("blurAds", blurToggle!.checked).then(render);
});
chimeToggle.addEventListener("change", () => {
  void setSetting("chimeOnSkip", chimeToggle!.checked).then(render);
});
sitesLink.addEventListener("click", () => {
  void api.runtime.openOptionsPage();
});

void render();
