import { describe, expect, it } from "vitest";
import { AdDetector, DEFAULT_OPTIONS } from "../src/core/detector.js";

describe("AdDetector", () => {
  it("starts out of the ad state", () => {
    expect(new AdDetector().inAd).toBe(false);
  });

  it("enters the ad state on a single ad verdict (eager entry)", () => {
    const detector = new AdDetector();
    expect(detector.push("ad", 0)).toBe("ad-started");
    expect(detector.inAd).toBe(true);
  });

  it("requires consecutive music verdicts to exit (conservative exit)", () => {
    const detector = new AdDetector();
    detector.push("ad", 0);
    expect(detector.push("music", 1_000)).toBeNull();
    expect(detector.push("music", 2_000)).toBe("ad-ended");
    expect(detector.inAd).toBe(false);
  });

  it("unknown breaks an exit streak — a flicker cannot unmute mid-ad", () => {
    const detector = new AdDetector();
    detector.push("ad", 0);
    detector.push("music", 1_000);
    expect(detector.push("unknown", 2_000)).toBeNull();
    expect(detector.push("music", 3_000)).toBeNull(); // streak restarted
    expect(detector.push("music", 4_000)).toBe("ad-ended");
  });

  it("a confirming verdict also breaks an opposing streak", () => {
    const detector = new AdDetector();
    detector.push("ad", 0);
    detector.push("music", 1_000);
    detector.push("ad", 2_000); // still in the break
    expect(detector.push("music", 3_000)).toBeNull();
    expect(detector.push("music", 4_000)).toBe("ad-ended");
  });

  it("emits each transition exactly once", () => {
    const detector = new AdDetector();
    expect(detector.push("ad", 0)).toBe("ad-started");
    expect(detector.push("ad", 1_000)).toBeNull();
    expect(detector.push("ad", 2_000)).toBeNull();
  });

  it("fails open when blind while muted (watchdog)", () => {
    const detector = new AdDetector();
    detector.push("ad", 0);
    // Selectors break: nothing but unknown for blindUnmuteMs.
    expect(detector.push("unknown", 1_000)).toBeNull();
    expect(
      detector.push("unknown", 1_000 + DEFAULT_OPTIONS.blindUnmuteMs),
    ).toBe("ad-ended");
    expect(detector.inAd).toBe(false);
  });

  it("watchdog does not fire while signals still confirm the ad", () => {
    const detector = new AdDetector();
    detector.push("ad", 0);
    // A long ad break with live signals is trusted indefinitely.
    expect(detector.push("ad", 60_000)).toBeNull();
    expect(detector.push("unknown", 61_000)).toBeNull();
    expect(detector.push("ad", 70_000)).toBeNull();
    expect(detector.inAd).toBe(true);
  });

  it("watchdog never fires outside the ad state", () => {
    const detector = new AdDetector();
    expect(detector.push("unknown", 0)).toBeNull();
    expect(detector.push("unknown", 10 * DEFAULT_OPTIONS.blindUnmuteMs)).toBeNull();
  });

  it("honors custom thresholds", () => {
    const detector = new AdDetector({ enterAdAfter: 2 });
    expect(detector.push("ad", 0)).toBeNull();
    expect(detector.push("ad", 500)).toBe("ad-started");
  });
});
