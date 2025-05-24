import { z } from "zod"

const emojiRegex = /^[\p{Emoji}\uFE0F\s]+$/u;

export const emojis = z.string().regex(emojiRegex, {
  message: "Only emojis are allowed in this field",
});
