/**
 * Cross-browser handle to the WebExtension API.
 *
 * Firefox exposes the standards-track `browser` namespace; Chromium exposes
 * `chrome`. Both return Promises from every API we use under Manifest V3,
 * so this one-line shim replaces a polyfill dependency.
 */
declare const browser: typeof chrome | undefined;

export const api: typeof chrome =
  typeof browser !== "undefined" ? browser : chrome;
