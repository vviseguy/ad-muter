/**
 * Guard tests: the privacy posture, enforced rather than promised.
 *
 *   1. No code path may reach the network. The extension's README claims
 *      "zero network access" — this test makes that claim break the build
 *      instead of drifting.
 *   2. The manifest may never grow permissions. `storage` plus one
 *      content-script origin is the entire grant, on every browser target.
 *
 * If a future change legitimately needs to relax one of these, the diff
 * has to edit this file too — which is exactly the point.
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SUPPORTED_SITES } from "../src/shared/sites.js";
import { adapterFor } from "../src/sites/registry.js";
// @ts-ignore — plain-JS build script, imported for its pure manifest composer
import { TARGETS, makeManifest } from "../scripts/build.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Substrings that indicate a way to reach the network from extension code. */
const NETWORK_TOKENS = [
  "fetch(",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "sendBeacon",
  "importScripts",
];

export function findNetworkTokens(source: string): string[] {
  return NETWORK_TOKENS.filter((token) => source.includes(token));
}

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory() ? sourceFiles(full) : [full];
    }),
  );
  return files.flat();
}

describe("guard: zero network access", () => {
  it("the scanner itself catches network tokens (self-test)", () => {
    expect(findNetworkTokens('fetch("https://example.com")')).toEqual(["fetch("]);
    expect(findNetworkTokens("const ws = new WebSocket(url)")).toEqual([
      "WebSocket",
    ]);
    expect(findNetworkTokens("api.tabs.update(tabId, { muted: true })")).toEqual(
      [],
    );
  });

  it("no source file contains a network call", async () => {
    for (const file of await sourceFiles(join(ROOT, "src"))) {
      const found = findNetworkTokens(await readFile(file, "utf8"));
      expect(found, `${file} reaches for the network via ${found}`).toEqual([]);
    }
  });
});

describe("guard: frozen permission surface", () => {
  it("base manifest asks for storage and nothing else", async () => {
    const base = JSON.parse(
      await readFile(join(ROOT, "manifest", "base.json"), "utf8"),
    );
    expect(base.permissions).toEqual(["storage"]);
    expect(base.host_permissions).toBeUndefined();
    expect(base.optional_permissions).toBeUndefined();
    expect(base.content_scripts).toHaveLength(1);
    // The frozen origin list. Growing it is a deliberate act: it means a
    // new site adapter shipped, and this guard is part of that diff.
    expect(base.content_scripts[0].matches).toEqual([
      "https://open.spotify.com/*",
      "https://www.youtube.com/*",
    ]);
  });

  it("each browser target's permissions are exactly the pinned set", async () => {
    const base = JSON.parse(
      await readFile(join(ROOT, "manifest", "base.json"), "utf8"),
    );
    // Chrome additionally gets "offscreen": MV3 service workers cannot play
    // audio, so the skip chime plays from an offscreen document. It grants
    // no data access and shows no install warning. Firefox's background
    // event page has a DOM, plays the chime itself, and stays storage-only.
    const pinned = {
      chrome: ["storage", "offscreen"],
      firefox: ["storage"],
    };
    expect(Object.keys(pinned).sort()).toEqual([...TARGETS].sort());
    for (const target of TARGETS) {
      const manifest = makeManifest(base, target);
      expect(manifest.permissions, target).toEqual(
        pinned[target as keyof typeof pinned],
      );
      expect(manifest.host_permissions, target).toBeUndefined();
      expect(manifest.content_scripts, target).toEqual(base.content_scripts);
    }
  });

  it("manifest origins, the supported-site list, and adapters agree", async () => {
    const base = JSON.parse(
      await readFile(join(ROOT, "manifest", "base.json"), "utf8"),
    );
    // One source of truth, three consumers: the options screen shows
    // SUPPORTED_SITES, the manifest grants exactly those origins, and every
    // listed site has a content-side adapter. Drift in any direction fails.
    expect(base.content_scripts[0].matches).toEqual(
      SUPPORTED_SITES.map((site) => `https://${site.hostname}/*`),
    );
    for (const site of SUPPORTED_SITES) {
      expect(adapterFor(site.hostname), site.hostname).not.toBeNull();
    }
  });
});
