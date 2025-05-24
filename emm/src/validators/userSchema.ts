import { z } from "zod/v4"
import { v4 as uuidv4 } from "uuid"

// user form
export const userData = z.strictObject({
  // id: z.uuidv4({ error: "Invalid UUID format for user ID" }),
  id: uuidv4(),
  username: z.string({ error: "Username is required" }).min(3, { error: "Username must be at least 3 characters" }),
  password: z.string({ error: "Password is required" }).min(6, { error: "Password must be at least 6 characters long" }),
})

// to be removed in prod
const u = userData.safeParse({})

if (!u.success) {
  console.log(z.prettifyError(u.error))
}
