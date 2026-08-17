import { api } from "./api.js";
import { SUPPORTED_SITES } from "./sites.js";

/**
 * User settings, stored flat in `storage.sync` so they follow the user's
 * browser profile. Per-site switches use one key per hostname
 * (`site:<hostname>`); a missing key means "on" everywhere, so the
 * extension works out of the box and new sites default to active.
 */
export interface Settings {
  /** Master switch. When off, nothing is muted, blurred, or chimed. */
  readonly enabled: boolean;
  /** Blur the player's visuals while an ad plays. */
  readonly blurAds: boolean;
  /** Play a short local chime when an ad becomes skippable. */
  readonly chimeOnSkip: boolean;
  /** Per-site switches, keyed by hostname. Every supported site has a key. */
  readonly sites: Readonly<Record<string, boolean>>;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  blurAds: true,
  chimeOnSkip: true,
  sites: Object.fromEntries(
    SUPPORTED_SITES.map((site) => [site.hostname, true]),
  ),
};

type FlagKey = "enabled" | "blurAds" | "chimeOnSkip";
const FLAG_KEYS: readonly FlagKey[] = ["enabled", "blurAds", "chimeOnSkip"];

const siteKey = (hostname: string): string => `site:${hostname}`;

export async function getSettings(): Promise<Settings> {
  const keys = [
    ...FLAG_KEYS,
    ...SUPPORTED_SITES.map((site) => siteKey(site.hostname)),
  ];
  const stored = await api.storage.sync.get(keys);
  return {
    enabled: stored["enabled"] !== false,
    blurAds: stored["blurAds"] !== false,
    chimeOnSkip: stored["chimeOnSkip"] !== false,
    sites: Object.fromEntries(
      SUPPORTED_SITES.map((site) => [
        site.hostname,
        stored[siteKey(site.hostname)] !== false,
      ]),
    ),
  };
}

/** Is the extension active on this site? (Missing hostname counts as on.) */
export function siteOn(settings: Settings, hostname: string): boolean {
  return settings.sites[hostname] !== false;
}

export async function setSetting(key: FlagKey, value: boolean): Promise<void> {
  await api.storage.sync.set({ [key]: value });
}

export async function setSiteEnabled(
  hostname: string,
  value: boolean,
): Promise<void> {
  await api.storage.sync.set({ [siteKey(hostname)]: value });
}

/** Fires with a fresh, complete snapshot whenever any of our keys change. */
export function onSettingsChanged(callback: (settings: Settings) => void): void {
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const relevant = Object.keys(changes).some(
      (key) =>
        (FLAG_KEYS as readonly string[]).includes(key) ||
        key.startsWith("site:"),
    );
    if (relevant) void getSettings().then(callback);
  });
}
