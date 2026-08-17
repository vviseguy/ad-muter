import type { SiteAdapter } from "../types.js";
import { SELECTORS } from "./selectors.js";

/**
 * YouTube's player announces ads itself: the player element carries the
 * `ad-showing` class for exactly as long as a video ad plays. That makes
 * the verdict two definitive states with a real tri-state fallback:
 *
 *   player found + class present  → "ad"
 *   player found + class absent   → "music"  (regular content)
 *   player not found              → "unknown" (never a guess)
 */
export const youtubeAdapter: SiteAdapter = {
  hostnames: ["www.youtube.com"],

  readVerdict(doc) {
    const player = doc.querySelector(SELECTORS.player);
    if (player === null) return "unknown";
    return player.classList.contains(SELECTORS.adShowingClass) ? "ad" : "music";
  },

  // Blur only the video surface; the skip button and controls stay usable.
  cosmeticTargets(doc) {
    const video = doc.querySelector(SELECTORS.video);
    return video === null ? [] : [video];
  },

  // The Skip button is mounted when the ad becomes skippable.
  canSkip: (doc) => doc.querySelector(SELECTORS.skipButton) !== null,

  // Fast path: watch the player's class attribute — `ad-showing` appearing
  // or vanishing is the transition itself. The player may not exist yet on
  // a fresh SPA navigation, so retry the attach until it does; the shared
  // 1s interval covers detection in the meantime.
  observe(doc, onSignal) {
    const attach = (): boolean => {
      const player = doc.querySelector(SELECTORS.player);
      if (player === null) return false;
      new MutationObserver(onSignal).observe(player, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return true;
    };
    if (attach()) return;
    const retry = setInterval(() => {
      if (attach()) clearInterval(retry);
    }, 1_000);
  },
};
