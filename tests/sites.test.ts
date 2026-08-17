// @vitest-environment jsdom
/**
 * Site adapters and cosmetics against DOM fixtures. These test the read
 * path end to end: real querySelector calls against the markup shapes
 * documented in each site's selectors.ts.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { setBlur } from "../src/content/cosmetics.js";
import { adapterFor } from "../src/sites/registry.js";
import { readSnapshot, spotifyAdapter } from "../src/sites/spotify/index.js";
import { youtubeAdapter } from "../src/sites/youtube/index.js";

beforeEach(() => {
  document.body.innerHTML = "";
  document.title = "";
});

describe("registry", () => {
  it("maps hostnames to adapters, and unknown hosts to null", () => {
    expect(adapterFor("open.spotify.com")).toBe(spotifyAdapter);
    expect(adapterFor("www.youtube.com")).toBe(youtubeAdapter);
    expect(adapterFor("example.com")).toBeNull();
  });
});

describe("spotify adapter", () => {
  it("reads music from a track link in the now-playing bar", () => {
    document.body.innerHTML = `
      <footer data-testid="now-playing-widget">
        <a href="/track/4uLU6hMCjMI75M1A2tKUQC">Song</a>
      </footer>`;
    expect(readSnapshot(document).trackLinkPresent).toBe(true);
    expect(spotifyAdapter.readVerdict(document)).toBe("music");
  });

  it("reads an ad from an advertisement marker", () => {
    document.body.innerHTML = `
      <footer data-testid="now-playing-widget">
        <div data-testid="advertisement-container">Sponsor</div>
      </footer>`;
    expect(spotifyAdapter.readVerdict(document)).toBe("ad");
  });

  it("reads an ad from an aria-label, case-insensitively", () => {
    document.body.innerHTML = `
      <footer data-testid="now-playing-widget">
        <div aria-label="Advertisement">Sponsor</div>
      </footer>`;
    expect(spotifyAdapter.readVerdict(document)).toBe("ad");
  });

  it("falls back to the title when the widget is missing", () => {
    document.title = "Advertisement - Spotify";
    expect(spotifyAdapter.readVerdict(document)).toBe("ad");
  });

  it("reports unknown on an empty page", () => {
    expect(spotifyAdapter.readVerdict(document)).toBe("unknown");
  });

  it("targets the now-playing bar for blur", () => {
    document.body.innerHTML = `<footer data-testid="now-playing-widget"></footer>`;
    const targets = spotifyAdapter.cosmeticTargets(document);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.getAttribute("data-testid")).toBe("now-playing-widget");
  });
});

describe("youtube adapter", () => {
  it("reads an ad from the ad-showing class", () => {
    document.body.innerHTML = `
      <div id="movie_player" class="html5-video-player ad-showing"></div>`;
    expect(youtubeAdapter.readVerdict(document)).toBe("ad");
  });

  it("reads content when the player lacks the ad class", () => {
    document.body.innerHTML = `
      <div id="movie_player" class="html5-video-player"></div>`;
    expect(youtubeAdapter.readVerdict(document)).toBe("music");
  });

  it("reports unknown when there is no player (never guesses)", () => {
    expect(youtubeAdapter.readVerdict(document)).toBe("unknown");
  });

  it("blurs only the video surface, never the controls", () => {
    document.body.innerHTML = `
      <div id="movie_player" class="ad-showing">
        <video class="html5-main-video"></video>
        <div class="ytp-chrome-bottom"><button class="ytp-skip-ad-button"></button></div>
      </div>`;
    const targets = youtubeAdapter.cosmeticTargets(document);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.tagName).toBe("VIDEO");
  });
});

describe("cosmetics", () => {
  it("adds and removes the blur class idempotently", () => {
    document.body.innerHTML = `<video></video>`;
    const video = document.querySelector("video")!;

    setBlur(document, [video], true);
    setBlur(document, [video], true);
    expect(video.classList.contains("ad-muter-blur")).toBe(true);

    setBlur(document, [video], false);
    expect(video.classList.contains("ad-muter-blur")).toBe(false);
    // The style tag is installed exactly once.
    expect(document.querySelectorAll("#ad-muter-style")).toHaveLength(1);
  });

  it("heals when the player re-renders: stale elements lose the class", () => {
    document.body.innerHTML = `<video id="old"></video><video id="new"></video>`;
    const oldVideo = document.querySelector("#old")!;
    const newVideo = document.querySelector("#new")!;

    setBlur(document, [oldVideo], true);
    setBlur(document, [newVideo], true); // player swapped its video element
    expect(oldVideo.classList.contains("ad-muter-blur")).toBe(false);
    expect(newVideo.classList.contains("ad-muter-blur")).toBe(true);
  });
});
