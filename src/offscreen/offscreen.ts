/**
 * Offscreen document (Chrome only): plays the bundled chime on request.
 * This is the entire file on purpose — it can do nothing else.
 */
import { api } from "../shared/api.js";
import type { Message } from "../shared/messages.js";

api.runtime.onMessage.addListener((message: Message) => {
  if (message.kind === "play-chime") {
    void new Audio("chime.wav").play().catch(() => undefined);
  }
});
