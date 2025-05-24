import { Account, coField, Profile } from "jazz-tools";
import { UserList } from "@/stores/jazzStorage";

/**
 * UserProfile contains simple profile-level metadata
 * Separate from auth or user credential data.
 */
export class UserProfile extends Profile {
  username = coField.string;
  // You can add more here later: avatar = coField.string; etc.
}

/**
 * UserAccount is the main schema for session/auth users.
 * It extends the base Jazz Account with:
 * - A ref to their UserProfile
 * - A ref to the global UserList
 */
export class UserAccount extends Account {
  profile = coField.ref(() => UserProfile);
  userList = coField.ref(() => UserList);
}
