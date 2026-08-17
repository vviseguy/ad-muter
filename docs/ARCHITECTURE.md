# Architecture

Three layers with one-way data flow. Each layer has exactly one
responsibility and one seam to the next.

| Layer | Files | Job | May touch |
|---|---|---|---|
| Read | `src/content/` | Turn the page into a `PlayerSnapshot` | DOM (read-only) |
| Decide | `src/core/` | Turn snapshots into ad-state transitions | Nothing — pure |
| Act | `src/background/` | Turn transitions into tab mute/unmute | Extension APIs |

`src/shared/` holds the seams: the typed message protocol (`messages.ts`),
the one setting (`settings.ts`), and the two-line cross-browser API shim
(`api.ts`).

## Rules that keep the layers honest

- **Core is pure.** No browser APIs, no DOM, no `Date.now()` — callers pass
  the clock in. Every behavior, including watchdog timing, is unit-tested
  without mocks.
- **The content script never acts.** It cannot mute anything; it only reads
  and reports. All authority lives in the background worker.
- **The background worker never reads the page.** It knows nothing about
  Spotify's DOM; it receives `{ inAd: boolean }` and manages tab state.
- **Every runtime message is typed** in `shared/messages.ts`. There are two.

## Muting: why the tab-mute API

`tabs.update(tabId, { muted: true })` is the browser's own per-tab mute —
the identical control behind the speaker icon on the tab strip.

- It catches all audio from the tab regardless of how it's produced
  (`<audio>` elements, Web Audio, anything future).
- It's visible and honest: the user sees the standard muted-tab icon and can
  override it with one click.
- It needs **no permission** — the muted property is not on the browser's
  sensitive list (unlike `url`/`title`, which we never read).
- It never touches the page, so there's nothing for the player to break.

## Mute etiquette

The worker records `mutedTab:<id>` in `storage.session` when — and only
when — it mutes a tab.

- Tab already muted when an ad starts (user did it): no record, no action,
  and **no unmute** when the ad ends. The user's choice outlives ours.
- `storage.session` survives service-worker suspension (MV3 workers stop
  after ~30s idle) and is cleared when the browser exits — the exact
  lifetime of tab-mute state itself.
- Disabling the extension in the popup releases every mute it holds.

## Failure modes, and what each one costs

Designed so the worst case of any failure is *ad audio you hear* or *a
muted moment* — never a stuck-muted tab, never broken playback.

| Failure | Outcome |
|---|---|
| Selectors break (player redesign) | Verdicts go `unknown`; state never flips on a guess. If it happens mid-ad, the core's watchdog unmutes after 15s of blindness. |
| Service worker suspended mid-break | The next content-script message wakes it; `storage.session` still has the bookkeeping. |
| Extension reloaded/updated under an open tab | Orphaned content script's messages fail silently; a still-muted tab is one click on the tab-strip speaker icon. |
| Browser restart with a muted tab restored | Session bookkeeping is gone; same one-click recovery, and the next ad cycle re-syncs. |
| Two tabs playing at once | All state is per-tab (`sender.tab.id`); each tab mutes and unmutes independently. |
