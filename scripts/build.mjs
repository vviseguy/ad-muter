/**
 * Build: bundles the three entry points with esbuild and assembles one
 * ready-to-load directory per browser target under dist/.
 *
 *   dist/chrome/   — Chrome, Edge, Brave, Opera, Vivaldi (load unpacked)
 *   dist/firefox/  — Firefox (load as temporary add-on / submit to AMO)
 *
 * The two targets differ ONLY in how the background script is declared and
 * in Firefox's required add-on metadata. `makeManifest` is exported so the
 * guard tests can assert that no target ever grows extra permissions.
 */
import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderChimeWav } from "./gen-chime.mjs";
import { renderIconPng } from "./gen-icons.mjs";

const root = new URL("..", import.meta.url);
const path = (relative) => fileURLToPath(new URL(relative, root));

export const TARGETS = ["chrome", "firefox"];

/** Compose the manifest for one browser target from the shared base. */
export function makeManifest(base, target) {
  switch (target) {
    case "chrome":
      return {
        ...base,
        background: { service_worker: "background.js" },
        // Chrome-only: an offscreen document plays the skip chime, because
        // MV3 service workers cannot play audio and the ad tab is muted.
        // Firefox's background event page has a DOM and needs no extra
        // permission. This is pinned per-target by the guard tests.
        permissions: [...base.permissions, "offscreen"],
      };
    case "firefox":
      return {
        ...base,
        // Firefox MV3 runs background scripts as an event page.
        background: { scripts: ["background.js"] },
        browser_specific_settings: {
          gecko: {
            id: "ad-muter@vviseguy.github.io",
            strict_min_version: "121.0",
            // AMO's data-collection disclosure: this extension collects nothing.
            data_collection_permissions: { required: ["none"] },
          },
        },
      };
    default:
      throw new Error(`unknown target: ${target}`);
  }
}

async function main() {
  // The version lives in package.json alone; the manifest gets stamped at
  // build time so the two can never drift (`npm version` bumps everything).
  const pkg = JSON.parse(await readFile(path("package.json"), "utf8"));
  const base = {
    ...JSON.parse(await readFile(path("manifest/base.json"), "utf8")),
    version: pkg.version,
  };
  await rm(path("dist"), { recursive: true, force: true });

  for (const target of TARGETS) {
    const out = (relative) => path(`dist/${target}/${relative}`);
    await mkdir(out("icons"), { recursive: true });

    const entryPoints = {
      content: path("src/content/index.ts"),
      background: path("src/background/index.ts"),
      popup: path("src/popup/popup.ts"),
      options: path("src/options/options.ts"),
    };
    if (target === "chrome") {
      entryPoints.offscreen = path("src/offscreen/offscreen.ts");
    }

    await build({
      entryPoints,
      outdir: out(""),
      bundle: true,
      format: "iife", // content scripts cannot be modules; keep all entries uniform
      target: ["chrome110", "firefox121"],
      logLevel: "silent",
    });

    await cp(path("src/popup/popup.html"), out("popup.html"));
    await cp(path("src/options/options.html"), out("options.html"));
    await cp(path("src/ui/theme.css"), out("theme.css"));
    if (target === "chrome") {
      await cp(path("src/offscreen/offscreen.html"), out("offscreen.html"));
    }
    await writeFile(out("chime.wav"), renderChimeWav());
    await writeFile(
      out("manifest.json"),
      JSON.stringify(makeManifest(base, target), null, 2) + "\n",
    );
    for (const size of [16, 32, 48, 128]) {
      await writeFile(out(`icons/icon-${size}.png`), renderIconPng(size));
    }
  }

  console.log(`built: ${TARGETS.map((t) => `dist/${t}`).join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
