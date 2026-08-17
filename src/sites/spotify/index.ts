import type { PlayerSnapshot } from "./snapshot.js";
import type { SiteAdapter } from "../types.js";
import { judge } from "./judge.js";
import { SELECTORS } from "./selectors.js";

/**
 * Read one {@link PlayerSnapshot} from the page: pull three facts out of
 * the DOM and hand them to the judge. If the now-playing bar is missing,
 * its two signals are `null` ("could not read"), never `false` — the judge
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

export const spotifyAdapter: SiteAdapter = {
  hostnames: ["open.spotify.com"],

  readVerdict: (doc) => judge(readSnapshot(doc)),

  // During an ad the now-playing bar shows the ad's artwork and copy —
  // blur the whole bar. There is nothing in it the user needs mid-ad.
  cosmeticTargets(doc) {
    const widget = doc.querySelector(SELECTORS.nowPlayingWidget);
    return widget === null ? [] : [widget];
  },

  // Title flips are the fastest ad-start signal — sample the instant one lands.
  observe(doc, onSignal) {
    const titleElement = doc.querySelector("title");
    if (titleElement === null) return;
    new MutationObserver(onSignal).observe(titleElement, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  },
};
