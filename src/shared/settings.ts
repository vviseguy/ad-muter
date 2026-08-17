import { api } from "./api.js";

/**
 * User settings, stored in `storage.sync` so they follow the browser
 * profile. Missing keys resolve to the defaults: the extension works out
 * of the box and new settings never surprise existing users with "off".
 */
export interface Settings {
  /** Master switch. When off, nothing is muted, blurred, or chimed. */
  readonly enabled: boolean;
  /** Blur the player's visuals while an ad plays. */
  readonly blurAds: boolean;
  /** Play a short local chime when an ad becomes skippable. */
  readonly chimeOnSkip: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  blurAds: true,
  chimeOnSkip: true,
};

const KEYS = Object.keys(DEFAULT_SETTINGS);

export async function getSettings(): Promise<Settings> {
  const stored = await api.storage.sync.get(KEYS);
  return {
    enabled: stored["enabled"] !== false,
    blurAds: stored["blurAds"] !== false,
    chimeOnSkip: stored["chimeOnSkip"] !== false,
  };
}

export async function setSetting(
  key: keyof Settings,
  value: boolean,
): Promise<void> {
  await api.storage.sync.set({ [key]: value });
}

export function onSettingsChanged(
  callback: (settings: Settings) => void,
): void {
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (!KEYS.some((key) => key in changes)) return;
    void getSettings().then(callback);
  });
}
