/**
 * Every DOM assumption about the YouTube player lives in this one file.
 *
 * Verification status: authored August 2026. The `ad-showing` class on the
 * player element has announced ads for many years and is the single
 * load-bearing signal here. Overlay/banner ads over regular content do NOT
 * set it — correct for us, since those don't interrupt audio.
 */
export const SELECTORS = {
  /** The video player container; carries state classes. */
  player: "#movie_player, .html5-video-player",

  /** Class present on the player element while any video ad plays. */
  adShowingClass: "ad-showing",

  /**
   * The video surface itself — the blur target. Deliberately NOT the whole
   * player: controls and the ad skip button must stay crisp and clickable.
   */
  video: "video.html5-main-video",
} as const;
