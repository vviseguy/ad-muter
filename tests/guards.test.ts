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
    expect(base.content_scripts[0].matches).toEqual([
      "https://open.spotify.com/*",
    ]);
  });

  it("no browser target adds permissions on top of the base", async () => {
    const base = JSON.parse(
      await readFile(join(ROOT, "manifest", "base.json"), "utf8"),
    );
    for (const target of TARGETS) {
      const manifest = makeManifest(base, target);
      expect(manifest.permissions, target).toEqual(base.permissions);
      expect(manifest.host_permissions, target).toBeUndefined();
      expect(manifest.content_scripts, target).toEqual(base.content_scripts);
    }
  });
});
