import { z } from "zod/v4";
import { emojis } from "./emoregex";

// review: strictObject
export const MessageInputSchema = z.strictObject({
  originalMessage: z.string().min(1, "Message cannot be empty"),
  emojiMessage: emojis,
})

export type MessageInput = z.infer<typeof MessageInputSchema>;
