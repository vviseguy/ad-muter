/**
 * Chime generator: synthesizes the "ad is now skippable" sound to WAV using
 * nothing but math. No audio dependencies, no checked-in binaries, fully
 * reproducible — same rule as the icons.
 *
 * The sound: two soft sine notes (E5 then B5), overlapping, with a fast
 * attack and exponential decay. Half a second, quiet, deliberately
 * notification-like rather than musical.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 22_050;
const DURATION_S = 0.5;
const AMPLITUDE = 0.28; // per note; two notes stay well clear of clipping

const NOTES = [
  { freq: 659.25, start: 0.0, dur: 0.22 }, // E5
  { freq: 987.77, start: 0.14, dur: 0.36 }, // B5
];

const ATTACK_S = 0.004; // fade-in that removes the click of a hard start

function sampleAt(t) {
  let value = 0;
  for (const note of NOTES) {
    const local = t - note.start;
    if (local < 0 || local > note.dur) continue;
    const attack = Math.min(local / ATTACK_S, 1);
    const decay = Math.exp((-6 * local) / note.dur);
    value += AMPLITUDE * attack * decay * Math.sin(2 * Math.PI * note.freq * local);
  }
  return value;
}

/** Render the chime as a 16-bit mono PCM WAV buffer. */
export function renderChimeWav() {
  const frames = Math.round(SAMPLE_RATE * DURATION_S);
  const data = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i++) {
    data.writeInt16LE(Math.round(sampleAt(i / SAMPLE_RATE) * 0x7fff), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

// Standalone use: write the WAV into assets/ for listening to it directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = fileURLToPath(new URL("../assets/", import.meta.url));
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}chime.wav`, renderChimeWav());
  console.log("wrote assets/chime.wav");
}
