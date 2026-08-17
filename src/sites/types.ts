import type { Verdict } from "../core/verdict.js";

/**
 * A site adapter is everything the extension knows about one web player.
 * Adding a site means adding one directory under src/sites/ that exports
 * one of these, and registering it in registry.ts — nothing else changes.
 */
export interface SiteAdapter {
  /** Hostnames this adapter serves (exact match against location.hostname). */
  readonly hostnames: readonly string[];

  /**
   * Read the page and say what's playing. Must be a pure DOM read with no
   * side effects, and must return "unknown" — never a guess — when its
   * signals can't be found.
   */
  readVerdict(doc: Document): Verdict;

  /**
   * Elements to blur while an ad plays. Cosmetic only; called every sample,
   * so returning the current elements keeps blur correct even when the
   * player re-renders mid-break. Anything the user needs to click during an
   * ad (e.g. a skip button) must NOT be included.
   */
  cosmeticTargets(doc: Document): readonly Element[];

  /**
   * Wire site-specific fast-path observers (e.g. a MutationObserver on the
   * element whose change announces an ad) and call `onSignal` when something
   * may have changed. The shared 1s interval is the guaranteed fallback, so
   * a lost observer degrades latency, never correctness.
   */
  observe(doc: Document, onSignal: () => void): void;
}
