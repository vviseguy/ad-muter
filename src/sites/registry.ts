import type { SiteAdapter } from "./types.js";
import { spotifyAdapter } from "./spotify/index.js";
import { youtubeAdapter } from "./youtube/index.js";

/**
 * All supported sites. The manifest's content-script matches and this list
 * must agree — each entry here needs its origin in manifest/base.json, and
 * the guard tests pin that manifest list.
 */
const ADAPTERS: readonly SiteAdapter[] = [spotifyAdapter, youtubeAdapter];

export function adapterFor(hostname: string): SiteAdapter | null {
  return ADAPTERS.find((adapter) => adapter.hostnames.includes(hostname)) ?? null;
}
