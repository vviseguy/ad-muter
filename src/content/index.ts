/**
 * Content script. Runs only on open.spotify.com (see manifest).
 *
 * Responsibilities, in full:
 *   1. read the page   (read-page.ts → PlayerSnapshot)
 *   2. ask the core    (judge + AdDetector → transitions)
 *   3. tell background (one small message per transition)
 *
 * It never touches audio, never blocks anything, and never talks to the
 * network. Muting happens in the background worker via the tab-mute API.
 */
import { AdDetector, type Transition } from "../core/detector.js";
import { judge } from "../core/judge.js";
import type { PlayerSnapshot } from "../core/snapshot.js";
import { api } from "../shared/api.js";
import type { AdStateMessage } from "../shared/messages.js";
import { readSnapshot } from "./read-page.js";

/**
 * Fallback sampling cadence. Title mutations trigger an immediate sample,
 * so this interval only bounds how stale the widget-based signals can get.
 */
const SAMPLE_INTERVAL_MS = 1_000;

const detector = new AdDetector();

function readSnapshotSafe(): PlayerSnapshot {
  try {
    return readSnapshot(document);
  } catch {
    // A DOM read should never throw; if one does, report total blindness
    // and let the core's fail-open watchdog handle a stuck mute.
    return { title: null, trackLinkPresent: null, adMarkerPresent: null };
  }
}

function sample(): void {
  const verdict = judge(readSnapshotSafe());
  const transition: Transition | null = detector.push(verdict, Date.now());
  if (transition === null) return;

  const message: AdStateMessage = {
    kind: "ad-state",
    inAd: transition === "ad-started",
  };
  // The promise rejects if the extension was reloaded out from under this
  // page ("context invalidated") — nothing to do but stay quiet.
  void api.runtime.sendMessage(message).catch(() => undefined);
}

// Title flips are the fastest ad-start signal — sample the instant one lands.
const titleElement = document.querySelector("title");
if (titleElement !== null) {
  new MutationObserver(sample).observe(titleElement, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

setInterval(sample, SAMPLE_INTERVAL_MS);
sample();
