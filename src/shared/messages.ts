/**
 * The complete message protocol between the extension's contexts.
 * Every runtime message in the codebase is one of these types; anything
 * else is a bug.
 */

/** Content → background: the detector's smoothed ad state flipped. */
export interface AdStateMessage {
  readonly kind: "ad-state";
  readonly inAd: boolean;
}

/** Content → background: the current ad just became user-skippable. */
export interface SkipAvailableMessage {
  readonly kind: "skip-available";
}

/** Background → offscreen document (Chrome only): play the chime. */
export interface PlayChimeMessage {
  readonly kind: "play-chime";
}

/** Popup → background: describe the given tab. */
export interface GetStatusMessage {
  readonly kind: "get-status";
  readonly tabId: number | null;
}

/** Background → popup: reply to {@link GetStatusMessage}. */
export interface StatusReply {
  readonly enabled: boolean;
  /** True if this extension is currently muting the tab. */
  readonly mutedByUs: boolean;
}

export type Message =
  | AdStateMessage
  | SkipAvailableMessage
  | PlayChimeMessage
  | GetStatusMessage;
