import { z } from "zod/v4"
import { MessageInputSchema } from "./messageClientSchema"

export const Msg = MessageInputSchema.extend({
  id: z.uuidv4({ error: "Invalid UUID format" }),
  senderId: z.uuidv4({ error: "Invalid sender ID" }),
  receiverId: z.uuidv4({ error: "Invalid receiver ID" }),
  timestamp: z.iso.date(),
});
