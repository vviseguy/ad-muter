/**
 * Generated assets: icons and the chime are code (scripts/gen-*.mjs), so
 * they get tests like code. These pin the containers' structure — a broken
 * generator should fail here, not at load time in the browser.
 */
import { describe, expect, it } from "vitest";
// @ts-ignore — plain-JS generator scripts
import { renderChimeWav } from "../scripts/gen-chime.mjs";
// @ts-ignore — plain-JS generator scripts
import { renderIconPng } from "../scripts/gen-icons.mjs";

describe("generated icons", () => {
  it("are valid PNG containers at every manifest size", () => {
    for (const size of [16, 32, 48, 128]) {
      const png: Buffer = renderIconPng(size);
      // PNG signature, then IHDR must be the first chunk.
      expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(png.subarray(12, 16).toString("ascii")).toBe("IHDR");
      expect(png.readUInt32BE(16)).toBe(size); // width
      expect(png.readUInt32BE(20)).toBe(size); // height
    }
  });
});

describe("generated chime", () => {
  it("is a valid 16-bit mono PCM WAV with audible content", () => {
    const wav: Buffer = renderChimeWav();
    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wav.readUInt16LE(20)).toBe(1); // PCM
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt16LE(34)).toBe(16); // bit depth
    // Not silence: some sample must have real amplitude.
    let peak = 0;
    for (let i = 44; i < wav.length; i += 2) {
      peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
    }
    expect(peak).toBeGreaterThan(0x7fff * 0.2);
    // ...and it must decay back toward silence at the end (no click).
    expect(Math.abs(wav.readInt16LE(wav.length - 2))).toBeLessThan(0x7fff * 0.02);
  });
});
