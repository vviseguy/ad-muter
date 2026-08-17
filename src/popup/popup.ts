/**
 * Popup: shows the current state and hosts the one setting.
 * All state lives in the background worker and storage; the popup is a view.
 */
import { api } from "../shared/api.js";
import type { GetStatusMessage, StatusReply } from "../shared/messages.js";
import { setEnabled } from "../shared/settings.js";

const toggle = document.querySelector<HTMLInputElement>("#enabled");
const status = document.querySelector<HTMLParagraphElement>("#status");
if (toggle === null || status === null) throw new Error("popup markup missing");

async function activeTabId(): Promise<number | null> {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

async function render(): Promise<void> {
  const message: GetStatusMessage = {
    kind: "get-status",
    tabId: await activeTabId(),
  };
  const reply = (await api.runtime.sendMessage(message)) as StatusReply;

  toggle!.checked = reply.enabled;
  if (!reply.enabled) {
    status!.textContent = "Off — ads play at full volume.";
    status!.className = "";
  } else if (reply.mutedByUs) {
    status!.textContent = "Ad break — tab muted.";
    status!.className = "muting";
  } else {
    status!.textContent = "Listening. Music is untouched.";
    status!.className = "";
  }
}

toggle.addEventListener("change", () => {
  void setEnabled(toggle!.checked).then(render);
});

void render();
