/**
 * ZIP packager: turns each dist/<target>/ into a store-submittable
 * dist/ad-muter-<version>-<target>.zip using nothing but node:zlib —
 * same no-dependency rule as the PNG and WAV generators.
 *
 * The zips are deterministic: entries are sorted and timestamps fixed, so
 * the same source always produces byte-identical archives — anyone can
 * rebuild and diff a published zip against the tag it claims to be.
 */
import { deflateRawSync } from "node:zlib";
import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { crc32 } from "./lib/crc32.mjs";
import { TARGETS } from "./build.mjs";

const root = new URL("..", import.meta.url);
const path = (relative) => fileURLToPath(new URL(relative, root));

/** Fixed DOS timestamp (2026-01-01 00:00) for reproducible archives. */
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
const DOS_TIME = 0;

/** Build a ZIP from [{name, data}] entries (deflate, minimal fields). */
export function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // method: deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    localParts.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central directory signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(8, 10); // method
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    // extra/comment/disk/attrs all zero (offsets 30-37)
    central.writeUInt32LE(offset, 42); // local header offset
    centralParts.push(central, nameBytes);

    offset += 30 + nameBytes.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralDir, end]);
}

/**
 * Zip names are deliberately version-free (ad-muter-chrome.zip): the
 * release tag carries the version, the manifest inside the zip carries the
 * version, and stable names give the README permanent
 * `releases/latest/download/…` links.
 */
async function zipTarget(target) {
  const dir = path(`dist/${target}`);
  const names = (await readdir(dir, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) =>
      `${entry.parentPath.slice(dir.length)}/${entry.name}`
        .replaceAll("\\", "/")
        .replace(/^\/+/, ""),
    )
    .sort(); // deterministic order
  const entries = await Promise.all(
    names.map(async (name) => ({
      name,
      data: await readFile(`${dir}/${name}`),
    })),
  );
  const outFile = path(`dist/ad-muter-${target}.zip`);
  await writeFile(outFile, buildZip(entries));
  console.log(`packaged: dist/ad-muter-${target}.zip (${names.length} files)`);
}

async function main() {
  for (const target of TARGETS) {
    await access(path(`dist/${target}/manifest.json`)).catch(() => {
      throw new Error(`dist/${target} missing — run \`npm run build\` first`);
    });
    await zipTarget(target);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
