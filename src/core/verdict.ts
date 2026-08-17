/**
 * The core layer is pure: no browser APIs, no DOM, no timers.
 * Site adapters (src/sites/) turn a page into `Verdict`s; the core smooths
 * them into a stable ad state. Everything here is unit-tested.
 */

/** What one observation says about the player, before any smoothing. */
export type Verdict = "music" | "ad" | "unknown";
