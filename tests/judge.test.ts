import { describe, expect, it } from "vitest";
import { judge } from "../src/sites/spotify/judge.js";
import type { PlayerSnapshot } from "../src/sites/spotify/snapshot.js";

const snapshot = (overrides: Partial<PlayerSnapshot>): PlayerSnapshot => ({
  title: null,
  trackLinkPresent: null,
  adMarkerPresent: null,
  ...overrides,
});

describe("spotify judge", () => {
  it("returns unknown when nothing is readable", () => {
    expect(judge(snapshot({}))).toBe("unknown");
  });

  it("explicit ad marker outranks everything", () => {
    expect(
      judge(
        snapshot({
          adMarkerPresent: true,
          trackLinkPresent: true, // contradictory DOM: marker still wins
          title: "Song • Artist",
        }),
      ),
    ).toBe("ad");
  });

  it("track link outranks the title heuristics", () => {
    expect(
      judge(snapshot({ trackLinkPresent: true, title: "Advertisement" })),
    ).toBe("music");
  });

  it("recognizes ad titles", () => {
    expect(judge(snapshot({ title: "Advertisement" }))).toBe("ad");
    expect(judge(snapshot({ title: "Advertisement - Spotify" }))).toBe("ad");
    expect(judge(snapshot({ title: "advertisement" }))).toBe("ad");
  });

  it("recognizes now-playing titles by their separator", () => {
    expect(judge(snapshot({ title: "Song Name • Artist Name" }))).toBe("music");
  });

  it("a track merely mentioning 'advertisement' is still music", () => {
    expect(
      judge(snapshot({ title: "This Song Is An Advertisement • Band" }))
    ).toBe("music");
  });

  it("false signals do not vote", () => {
    // false means "read it, and it's absent" — that alone proves nothing.
    expect(
      judge(
        snapshot({
          adMarkerPresent: false,
          trackLinkPresent: false,
          title: "Spotify – Web Player",
        }),
      ),
    ).toBe("unknown");
  });
});
