# Privacy

## The whole policy

Ad Muter collects nothing, stores nothing about you, and sends nothing
anywhere. It has no server. Every byte it reads stays inside your browser.

## Enforced, not promised

Privacy policies are usually promises. This one is a build constraint:

- **Zero network access** — no source file may contain `fetch`,
  `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, or
  `importScripts`. A [guard test](../tests/guards.test.ts) scans for these
  and fails CI if one appears. There is no error reporting and no analytics
  because there is no way to transmit them.
- **Frozen permission surface** — the manifest grants `storage` plus a
  content script on `https://open.spotify.com/*`, on every browser target.
  The same guard test pins this; a PR that adds a permission fails CI until
  it also rewrites the guard — visibly, in the diff.
- **No remote code** — Manifest V3 forbids it, and with no network access
  there is nothing to load it with.

## What the extension can see

- On `open.spotify.com` and `www.youtube.com` only: the handful of on-screen
  facts each site adapter reads (`src/sites/*/selectors.ts` is the complete
  list). It cannot see any other site, your history, or even the tab's URL
  (reading tab URLs requires the `tabs` permission, which it does not
  request).

## What it stores

| Where | What | Lifetime |
|---|---|---|
| `storage.sync` | One boolean: the on/off toggle | Until you change it |
| `storage.session` | Which tab IDs *this extension* muted | Cleared when the browser exits |

## The honest caveat

"Zero network access" describes this extension's code, verified by its
tests. It is not a claim that Spotify cannot infer anything: a web page can
observe some browser state if it goes looking, and no client-side tool can
promise invisibility. What this extension guarantees is narrower and
verifiable: *it* observes almost nothing, and *it* transmits nothing, ever.
