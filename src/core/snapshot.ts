/**
 * The core layer is pure: no browser APIs, no DOM, no timers.
 * It consumes `PlayerSnapshot`s (produced by the content layer) and decides
 * whether an ad break is in progress. Everything here is unit-tested.
 */

/**
 * One observation of the player's visible state.
 *
 * Every field is tri-state: `null` means "could not read this signal"
 * (e.g. the element the signal comes from is not in the DOM). Readers must
 * never guess — an unreadable signal is `null`, not `false`.
 */
export interface PlayerSnapshot {
  /** `document.title`, verbatim. `null` if empty/unreadable. */
  readonly title: string | null;
  /**
   * Whether the now-playing bar links to a real track or episode page.
   * Real music always links to its own page; ads have nothing to link to.
   * `null` if the now-playing bar itself was not found.
   */
  readonly trackLinkPresent: boolean | null;
  /**
   * Whether an explicit advertisement marker is present in the now-playing
   * bar. `null` if the now-playing bar itself was not found.
   */
  readonly adMarkerPresent: boolean | null;
}

/** What one snapshot says about the player, before any smoothing. */
export type Verdict = "music" | "ad" | "unknown";
