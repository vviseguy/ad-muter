/**
 * Content script. Runs only on the origins in the manifest, and picks the
 * matching site adapter for the page it finds itself on.
 *
 * Responsibilities, in full:
 *   1. read the page      (adapter.readVerdict)
 *   2. ask the core       (AdDetector → transitions)
 *   3. tell background    (one small message per transition; muting happens
 *                          there, via the browser's tab-mute API)
 *   4. apply cosmetics    (toggle the blur class — the one and only thing
 *                          this script ever writes to the page)
 *
 * It never touches audio, never blocks anything, and never talks to the
 * network.
 */
import { AdDetector } from "../core/detector.js";
import type { Verdict } from "../core/verdict.js";
import { api } from "../shared/api.js";
import type { AdStateMessage } from "../shared/messages.js";
import {
  DEFAULT_SETTINGS,
  getSettings,
  onSettingsChanged,
  type Settings,
} from "../shared/settings.js";
import { adapterFor } from "../sites/registry.js";
import type { SiteAdapter } from "../sites/types.js";
import { setBlur } from "./cosmetics.js";

/**
 * Fallback sampling cadence. Adapter observers trigger immediate samples,
 * so this interval only bounds detection latency when an observer is lost.
 */
const SAMPLE_INTERVAL_MS = 1_000;

function run(adapter: SiteAdapter): void {
  const detector = new AdDetector();
  let settings: Settings = DEFAULT_SETTINGS;
  void getSettings().then((loaded) => {
    settings = loaded;
    applyCosmetics();
  });
  onSettingsChanged((changed) => {
    settings = changed;
    applyCosmetics();
  });

  function applyCosmetics(): void {
    setBlur(
      document,
      adapter.cosmeticTargets(document),
      detector.inAd && settings.enabled && settings.blurAds,
    );
  }

  function sample(): void {
    let verdict: Verdict;
    try {
      verdict = adapter.readVerdict(document);
    } catch {
      // A DOM read should never throw; if one does, report blindness and
      // let the core's fail-open watchdog handle a stuck mute.
      verdict = "unknown";
    }
    const transition = detector.push(verdict, Date.now());
    applyCosmetics();
    if (transition === null) return;

    const message: AdStateMessage = {
      kind: "ad-state",
      inAd: transition === "ad-started",
    };
    // The promise rejects if the extension was reloaded out from under this
    // page ("context invalidated") — nothing to do but stay quiet.
    void api.runtime.sendMessage(message).catch(() => undefined);
  }

  adapter.observe(document, sample);
  setInterval(sample, SAMPLE_INTERVAL_MS);
  sample();
}

const adapter = adapterFor(location.hostname);
if (adapter !== null) run(adapter);
