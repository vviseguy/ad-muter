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
import { renderIconPng } from "./gen-icons.mjs";

const root = new URL("..", import.meta.url);
const path = (relative) => fileURLToPath(new URL(relative, root));

export const TARGETS = ["chrome", "firefox"];

/** Compose the manifest for one browser target from the shared base. */
export function makeManifest(base, target) {
  switch (target) {
    case "chrome":
      return { ...base, background: { service_worker: "background.js" } };
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
  const base = JSON.parse(await readFile(path("manifest/base.json"), "utf8"));
  await rm(path("dist"), { recursive: true, force: true });

  for (const target of TARGETS) {
    const out = (relative) => path(`dist/${target}/${relative}`);
    await mkdir(out("icons"), { recursive: true });

    await build({
      entryPoints: {
        content: path("src/content/index.ts"),
        background: path("src/background/index.ts"),
        popup: path("src/popup/popup.ts"),
      },
      outdir: out(""),
      bundle: true,
      format: "iife", // content scripts cannot be modules; keep all three uniform
      target: ["chrome110", "firefox121"],
      logLevel: "silent",
    });

    await cp(path("src/popup/popup.html"), out("popup.html"));
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
