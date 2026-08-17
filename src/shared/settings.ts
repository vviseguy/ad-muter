import { api } from "./api.js";

/**
 * User settings. There is exactly one: the on/off switch.
 * Stored in `storage.sync` so it follows the user's browser profile.
 */
const ENABLED_KEY = "enabled";

/** Missing key counts as enabled: the extension works out of the box. */
export async function isEnabled(): Promise<boolean> {
  const stored = await api.storage.sync.get(ENABLED_KEY);
  return stored[ENABLED_KEY] !== false;
}

export async function setEnabled(value: boolean): Promise<void> {
  await api.storage.sync.set({ [ENABLED_KEY]: value });
}

export function onEnabledChanged(callback: (enabled: boolean) => void): void {
  api.storage.onChanged.addListener((changes, area) => {
    const change = changes[ENABLED_KEY];
    if (area === "sync" && change !== undefined) {
      callback(change.newValue !== false);
    }
  });
}
