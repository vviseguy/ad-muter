/**
 * Options page: one switch per supported site. The list itself comes from
 * shared/sites.ts — the same fixed list the manifest and guards pin — so
 * this page can only ever toggle sites the extension already has.
 */
import { SUPPORTED_SITES } from "../shared/sites.js";
import { getSettings, setSiteEnabled, siteOn } from "../shared/settings.js";

const list = document.querySelector<HTMLDivElement>("#site-list");
if (list === null) throw new Error("options markup missing");

function siteRow(hostname: string, label: string, active: boolean): HTMLElement {
  const row = document.createElement("div");
  row.className = "row";

  const name = document.createElement("label");
  name.textContent = label;
  name.htmlFor = `site-${hostname}`;

  const toggle = document.createElement("label");
  toggle.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = `site-${hostname}`;
  input.checked = active;
  input.addEventListener("change", () => {
    void setSiteEnabled(hostname, input.checked);
  });
  toggle.append(input, document.createElement("span"));

  row.append(name, toggle);
  return row;
}

async function render(): Promise<void> {
  const settings = await getSettings();
  list!.replaceChildren(
    ...SUPPORTED_SITES.map((site) =>
      siteRow(site.hostname, site.label, siteOn(settings, site.hostname)),
    ),
  );
}

void render();
