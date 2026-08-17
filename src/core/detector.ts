import type { Verdict } from "./snapshot.js";

/** Emitted when the smoothed ad state flips. */
export type Transition = "ad-started" | "ad-ended";

export interface DetectorOptions {
  /**
   * Consecutive "ad" verdicts required to enter the ad state.
   * Defaults to 1: a false mute costs a moment of silence, while a slow
   * mute leaks ad audio — so entry is eager.
   */
  readonly enterAdAfter: number;
  /**
   * Consecutive "music" verdicts required to leave the ad state.
   * Defaults to 2: exit is conservative so a flickering DOM mid-break
   * cannot unmute in the middle of an ad.
   */
  readonly exitAdAfter: number;
  /**
   * Fail-open watchdog: if the detector is in the ad state but every signal
   * has read "unknown" for this long (ms), assume our selectors broke and
   * end the ad state. The invariant this protects: a bug in detection may
   * ever cost the user a muted moment, never a permanently muted tab.
   */
  readonly blindUnmuteMs: number;
}

export const DEFAULT_OPTIONS: DetectorOptions = {
  enterAdAfter: 1,
  exitAdAfter: 2,
  blindUnmuteMs: 15_000,
};

/**
 * Smooths a stream of per-snapshot verdicts into a stable in-ad/not-in-ad
 * state, with asymmetric hysteresis (see {@link DetectorOptions}).
 *
 * Pure and clock-free: callers pass the current time into {@link push},
 * which makes every timing behavior (including the watchdog) testable
 * without real timers.
 */
export class AdDetector {
  private readonly options: DetectorOptions;
  private inAdState = false;
  /** Length of the current run of consecutive opposing verdicts. */
  private streak = 0;
  /** Which verdict the current streak is counting. */
  private streakVerdict: Verdict = "unknown";
  /** Last time a definitive ("ad" or "music") verdict was seen. */
  private lastDefinitiveAtMs = 0;

  constructor(options: Partial<DetectorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get inAd(): boolean {
    return this.inAdState;
  }

  /**
   * Feed one verdict; returns a transition if the smoothed state flipped,
   * otherwise null.
   */
  push(verdict: Verdict, nowMs: number): Transition | null {
    if (verdict !== "unknown") {
      this.lastDefinitiveAtMs = nowMs;
    }

    // Watchdog: muted but flying blind — fail open.
    if (
      this.inAdState &&
      verdict === "unknown" &&
      nowMs - this.lastDefinitiveAtMs >= this.options.blindUnmuteMs
    ) {
      this.reset(false);
      return "ad-ended";
    }

    // "unknown" and confirmations of the current state both break any
    // opposing streak: state only flips on *consecutive* opposing evidence.
    const confirming: Verdict = this.inAdState ? "ad" : "music";
    if (verdict === "unknown" || verdict === confirming) {
      this.streak = 0;
      return null;
    }

    // Opposing verdict: count the streak.
    if (this.streakVerdict !== verdict) {
      this.streakVerdict = verdict;
      this.streak = 0;
    }
    this.streak += 1;

    const needed = this.inAdState
      ? this.options.exitAdAfter
      : this.options.enterAdAfter;
    if (this.streak < needed) return null;

    this.reset(verdict === "ad");
    return this.inAdState ? "ad-started" : "ad-ended";
  }

  private reset(inAd: boolean): void {
    this.inAdState = inAd;
    this.streak = 0;
    this.streakVerdict = "unknown";
  }
}
