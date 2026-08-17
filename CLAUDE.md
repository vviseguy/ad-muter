# ad-muter

Browser extension (MV3, TypeScript) that mutes the tab (and optionally
blurs the player) during ad breaks on open.spotify.com and www.youtube.com.
Mute-only by design: no blocking, no interception, no network access — that
posture is the product.

## Map

- `src/core/` — pure detection smoothing (no browser APIs; clock passed in)
- `src/sites/<site>/` — one adapter per player; DOM assumptions only in each `selectors.ts`
- `src/content/` — the loop (index.ts) + blur cosmetics (cosmetics.ts)
- `src/background/` — sole audio authority (tab-mute API)
- `src/shared/` — message protocol, settings, browser shim, sites.ts (the
  single supported-site list; options/manifest/adapters pinned to it)
- `src/options/` + `src/ui/theme.css` — per-site switches screen; popup and
  options share the one stylesheet
- `manifest/base.json` + `scripts/build.mjs` — one base, per-browser overlays
- `tests/guards.test.ts` — pins zero-network + frozen permissions; CI fails if violated

## Contracts (do not relax without explicit decision)

- Permissions are frozen per target: chrome = storage+offscreen (chime),
  firefox = storage; content scripts on the two origins only.
  New site = new adapter dir + registry line + manifest origin + guard edit.
- No network APIs anywhere in `src/`.
- Content script's only page write is the blur class (cosmetics.ts).
- NEVER click player controls (no auto-skip — Jacob decided 08-17; the
  chime announces skippability instead). canSkip is a read.
- Core stays pure; new guards need a negative test.
- Fail open: detection bugs may never leave a tab stuck muted or blurred.
- Generated assets (icons, chime.wav) are build outputs of scripts/gen-*.mjs
  with container tests in tests/assets.test.ts — never check in binaries.

## Workflow

- `npm run ci` (typecheck + test + build) before pushing.
- Selector changes require the live-verification recipe in docs/DETECTION.md.
- Never put "Spotify" in the extension `name` field or store listing title
  (trademark exposure — see README's trademark note).
