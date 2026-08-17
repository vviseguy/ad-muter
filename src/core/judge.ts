import type { PlayerSnapshot, Verdict } from "./snapshot.js";

/**
 * Ad titles observed on the web player start with the word "Advertisement".
 * Anchored so that a real track that merely *mentions* the word (e.g.
 * "This Song Is An Advertisement") does not match unless it leads the title.
 */
const AD_TITLE = /^advertisement\b/i;

/**
 * While music plays, the tab title is formatted "Track • Artist".
 * The separator (U+2022 with spaces) never appears in ad titles.
 */
const MUSIC_TITLE_SEPARATOR = " • ";

/**
 * Judge a single snapshot. Signals are consulted in strength order and the
 * first definitive one wins:
 *
 *   1. explicit ad marker      — strongest: the player itself labels ads
 *   2. track link presence     — strong: real music always links to a track page
 *   3. title shape             — weakest: string heuristics on the tab title
 *
 * If nothing is definitive the verdict is "unknown", which the detector
 * treats as "no new information" — it never changes state on a guess.
 */
export function judge(snapshot: PlayerSnapshot): Verdict {
  if (snapshot.adMarkerPresent === true) return "ad";
  if (snapshot.trackLinkPresent === true) return "music";

  const title = snapshot.title;
  if (title !== null) {
    if (AD_TITLE.test(title)) return "ad";
    if (title.includes(MUSIC_TITLE_SEPARATOR)) return "music";
  }

  return "unknown";
}
