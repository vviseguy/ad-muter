/**
 * Cosmetics: the blur applied to a player's visuals during an ad break.
 *
 * This is the content script's only write to the page, and it is exactly
 * one CSS class toggled on adapter-chosen elements. It's applied
 * idempotently every sample, so a player that re-renders mid-break heals
 * itself, and it's removed by the same transitions (including the fail-open
 * watchdog) that unmute the tab.
 */
const STYLE_ID = "ad-muter-style";
const BLUR_CLASS = "ad-muter-blur";

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `.${BLUR_CLASS} { filter: blur(28px) !important; transition: filter 0.2s ease; }`;
  doc.documentElement.append(style);
}

/** Make blur state match `on` for exactly the given targets. Idempotent. */
export function setBlur(
  doc: Document,
  targets: readonly Element[],
  on: boolean,
): void {
  ensureStyle(doc);
  const blurred = doc.querySelectorAll(`.${BLUR_CLASS}`);

  if (!on) {
    blurred.forEach((element) => element.classList.remove(BLUR_CLASS));
    return;
  }

  const wanted = new Set(targets);
  blurred.forEach((element) => {
    if (!wanted.has(element)) element.classList.remove(BLUR_CLASS);
  });
  targets.forEach((element) => element.classList.add(BLUR_CLASS));
}
