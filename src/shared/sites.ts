/**
 * The supported sites, as UI-facing metadata. This is the single list the
 * options screen, settings, and guards read; the content-side adapters in
 * src/sites/ must line up with it (a guard test enforces that, and that the
 * manifest's content-script matches are exactly these hostnames).
 *
 * Adding a site is a code change and a new extension version — by design.
 * There is no mechanism for the extension to gain access to a new site at
 * runtime.
 */
export interface SupportedSite {
  /** Exact hostname, as matched against location.hostname. */
  readonly hostname: string;
  /** Human-readable name for the options screen. */
  readonly label: string;
}

export const SUPPORTED_SITES: readonly SupportedSite[] = [
  { hostname: "open.spotify.com", label: "Spotify — web player" },
  { hostname: "www.youtube.com", label: "YouTube" },
];
