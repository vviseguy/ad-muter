import type { PlayerSnapshot } from "../core/snapshot.js";
import { SELECTORS } from "./selectors.js";

/**
 * Read one {@link PlayerSnapshot} from the page.
 *
 * This is the entire content-layer read path: pull three facts out of the
 * DOM and hand them to the pure core. If the now-playing bar is missing,
 * its two signals are `null` ("could not read"), never `false` — the core
 * treats guesses and facts differently.
 */
export function readSnapshot(doc: Document): PlayerSnapshot {
  const widget = doc.querySelector(SELECTORS.nowPlayingWidget);
  return {
    title: doc.title.length > 0 ? doc.title : null,
    trackLinkPresent:
      widget === null ? null : widget.querySelector(SELECTORS.trackLink) !== null,
    adMarkerPresent:
      widget === null ? null : widget.querySelector(SELECTORS.adMarker) !== null,
  };
}
