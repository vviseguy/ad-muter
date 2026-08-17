/**
 * Every DOM assumption about the web player lives in this one file.
 * When the player's markup changes, this is the only place to update.
 *
 * Verification status: authored against the open.spotify.com player as of
 * August 2026. The `trackLink` and title signals are the load-bearing ones;
 * `adMarker` is best-effort (confirming it requires catching a live ad break
 * on a free account — see docs/DETECTION.md for the verification recipe).
 */
export const SELECTORS = {
  /** The now-playing bar at the bottom of the player. */
  nowPlayingWidget: '[data-testid="now-playing-widget"]',

  /**
   * A link to a real track/episode page inside the now-playing bar.
   * Present for all real content; ads have no page to link to.
   */
  trackLink: 'a[href^="/track/"], a[href^="/episode/"]',

  /**
   * Explicit advertisement markers. Written broadly on purpose: any
   * test-id or accessibility label that mentions advertising counts.
   */
  adMarker: '[data-testid*="advert" i], [aria-label*="advertisement" i]',
} as const;
