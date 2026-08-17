# Ad Muter

A browser extension that **mutes the tab during ad breaks** — and, if you
like, **blurs the player** — then restores everything when content returns.

Supported players: `open.spotify.com` and `www.youtube.com`.

That is the entire feature. Ads still play, still count as delivered, and
nothing is blocked, intercepted, modified, or sent anywhere.

## What it does / deliberately does not do

| | |
|---|---|
| ✅ Detects ad breaks from what the player already shows on screen | ❌ No request blocking or filtering |
| ✅ Mutes the tab with the browser's own tab-mute control | ❌ No network traffic interception |
| ✅ Optionally blurs the player's visuals during the break (skip buttons stay crisp and clickable) | ❌ No client modification or premium spoofing |
| ✅ Optionally chimes when an ad becomes skippable — so you can look up and click Skip | ❌ No auto-skip: it never clicks anything for you (see FAQ) |
| ✅ Unmutes when the break ends — never touching a mute *you* set | ❌ No analytics, telemetry, or error reporting — **zero network access** |

## Permissions

The complete permission surface, with rationale. This table is enforced by
[a guard test](tests/guards.test.ts) — a pull request that grows it fails CI.

| Grant | Why |
|---|---|
| Content script on `https://open.spotify.com/*` and `https://www.youtube.com/*` | Read each player's on-screen state. The extension cannot see any other site. |
| `storage` | Remember the toggles, and track which tabs *we* muted so we never unmute one *you* muted. |
| `offscreen` (Chrome only) | Play the bundled skip chime. The ad tab is muted, so the sound comes from an offscreen extension page; this permission grants no data access and shows no install warning. Firefox plays the chime from its background page and doesn't need it. |

That's all of it. No `tabs`, no `<all_urls>`, no `webRequest`, no
`declarativeNetRequest`, no remote code. The same test suite also scans every
source file for network APIs (`fetch`, `XMLHttpRequest`, `WebSocket`, …) and
fails the build if one appears.

## How it works

Per-site adapters feed one shared pipeline:

```
┌──────────────────────┐   Verdict   ┌───────────────────┐   transition   ┌──────────────────────┐
│  site adapter        │ ──────────▶ │  core (pure)      │ ─────────────▶ │  background worker   │
│  reads the page      │             │  smooths verdicts │       │        │  mutes/unmutes tab   │
│  (sites/spotify,     │             │  (detector.ts)    │       │        │  (tab-mute API)      │
│   sites/youtube)     │             └───────────────────┘       ▼        └──────────────────────┘
└──────────────────────┘                            blur on/off (cosmetics.ts,
                                                    in-page, one CSS class)
```

- **Read** — each site adapter reads its player's own on-screen ad
  signaling: Spotify's now-playing bar and tab title; YouTube's `ad-showing`
  player class. Adding a site is one directory under `src/sites/`.
- **Decide** — a pure, fully unit-tested state machine smooths verdicts with
  asymmetric hysteresis: it mutes eagerly (one ad verdict) and unmutes
  conservatively (two consecutive content verdicts). If its signals ever go
  dark while muted, a watchdog fails **open** — a detection bug may cost you
  a muted moment, never a permanently muted tab.
- **Act** — the background worker flips the tab's mute state, the same
  control as the speaker icon on the tab strip. You can override it at any
  time by clicking that icon. The optional blur is the content script's one
  in-page action: a single CSS class on adapter-chosen elements, driven by
  the same transitions (watchdog included), and never on anything you'd
  need to click.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
[docs/DETECTION.md](docs/DETECTION.md) · [docs/PRIVACY.md](docs/PRIVACY.md)

## Install (from source)

```
npm install
npm run build
```

| Browser | How to load |
|---|---|
| Chrome / Edge / Brave / Opera / Vivaldi | `chrome://extensions` → enable Developer mode → **Load unpacked** → `dist/chrome` |
| Firefox | `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → `dist/firefox/manifest.json` |
| Safari | Run `xcrun safari-web-extension-converter dist/chrome` on macOS (untested; the API surface used is within Safari's WebExtension support) |

## Development

```
npm run ci        # typecheck + tests + build — what CI runs
npm test          # unit + guard tests
npm run icons     # regenerate icons (they are code, not binaries — scripts/gen-icons.mjs)
```

Each site's DOM assumptions live in one file —
[src/sites/spotify/selectors.ts](src/sites/spotify/selectors.ts) and
[src/sites/youtube/selectors.ts](src/sites/youtube/selectors.ts). When a
player's markup changes, that file is the fix, and
[docs/DETECTION.md](docs/DETECTION.md) has the verification recipes.

## FAQ

**Is this an ad blocker?**
No. Nothing is blocked. The ad plays, is delivered, and is counted; your
speakers just don't participate. This is the same category of tool as EZBlocker
on Windows — a listener-side mute, not an interception layer.

**Why not block the ads outright?**
Blocking requires intercepting the player's network traffic or modifying its
code — both fragile, both against Spotify's Terms of Service, and both the
reason other tools in this space have been removed from stores or gotten
accounts banned. Muting touches nothing that belongs to the service.

**Can Spotify tell I'm using it?**
The extension changes nothing the page can observe through its own delivery:
it doesn't touch the page's audio elements, network, or code. Tab mute
happens at the browser level, outside the page. (A page can still infer
output muting through browser APIs if it goes looking; no tool can promise
invisibility. See the honest version of this answer in
[docs/PRIVACY.md](docs/PRIVACY.md).)

**Can I turn it off for just one site?**
Yes — right-click the extension icon → **Options** (or the **Sites…** link
in the popup) for per-site switches. Switching a site off releases any mute
it holds immediately.

**Can I add my own sites?**
No, and that's deliberate. The site list is fixed by the extension's
manifest; adding one takes a code change and a new version. An extension
that could grow its own site access at runtime would be exactly the kind of
tool this project exists not to be.

**Why chime instead of auto-skipping the ad?**
Because the click is the line. Everything this extension does is on the
listener's side of the glass: what reaches your ears and eyes. The moment it
presses a player's controls for you, it becomes an agent interacting with
the ad system itself — synthesizing engagement signals, altering what
advertisers are billed for, and joining the tool category that stores
remove. The chime keeps the human as the actor: you hear it, you decide,
one click. (The skip chime is a generated WAV bundled at build time —
nothing is fetched.)

**Does it collect anything?**
It cannot. There is no code path to the network — enforced by tests, in a
public repo you can read in one sitting.

## Trademark note

Spotify is a trademark of Spotify AB. This project is not affiliated with,
endorsed by, or sponsored by Spotify. The name is used only to describe,
factually, which website the extension operates on.

## License

Dual-licensed under [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at
your option.
