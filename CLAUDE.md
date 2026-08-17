# ad-muter

Browser extension (MV3, TypeScript) that mutes the tab during ad breaks on
open.spotify.com. Mute-only by design: no blocking, no interception, no
network access — that posture is the product.

## Map

- `src/core/` — pure detection logic (no browser APIs; clock passed in)
- `src/content/` — DOM reading only; all selectors in `selectors.ts`
- `src/background/` — the only layer that acts (tab-mute API)
- `src/shared/` — message protocol, settings, browser shim
- `manifest/base.json` + `scripts/build.mjs` — one base, per-browser overlays
- `tests/guards.test.ts` — pins zero-network + frozen permissions; CI fails if violated

## Contracts (do not relax without explicit decision)

- Permissions are frozen: `storage` + content script on open.spotify.com only.
- No network APIs anywhere in `src/`.
- Core stays pure; new guards need a negative test.
- Fail open: detection bugs may never leave a tab stuck muted.

## Workflow

- `npm run ci` (typecheck + test + build) before pushing.
- Selector changes require the live-verification recipe in docs/DETECTION.md.
- Never put "Spotify" in the extension `name` field or store listing title
  (trademark exposure — see README's trademark note).
