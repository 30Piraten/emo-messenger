import { coField, CoMap, CoList, Account } from "jazz-tools";
import { z } from "zod";

// define User schema as a CoMap
export class User extends CoMap {
  id = coField.string;
  username = coField.string;
  password = coField.string; // hashed
}

// define UserList as a CoList of User references
export class UserList extends CoList.Of(coField.ref(User)) {};

// validation schema using Zod
const userValidationSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

// singleton global user list (lazy init per-account)
let globalUserList: UserList | null = null;

// initialise user list with account
export function initialiseUserList(account: Account): UserList {
  if (!globalUserList) {
    globalUserList = UserList.create([], { owner: account });
  }
  return globalUserList;
}

// save user data to Jazz (after hashed password passed in)
export async function saveUserToJazz(userData: { username: string; password: string }, account: Account): Promise<User> {

  try {
    // validate input data
    const parsed = userValidationSchema.safeParse(userData);
    if (!parsed.success) {
      throw new Error("invalid user data: " + JSON.stringify(parsed.error.issues));
    }

    // ensure user list is initialised
    const userList = initialiseUserList(account)

    // check for duplicate username
    for (const userRef of userList) {
      if (userRef?.username === userData.username) {
        throw new Error("username already exists");
      }
    }

    // create new user
    const newUser = await User.create({
      username: userData.username,
      password: userData.password, // hashed password from FormAuth.vue
    }, { owner: account })

    // add the user to the list
    userList.push(newUser);

    return  newUser;

  } catch(err) {
    console.log("failed to save user:", err);
    throw err;
  }
}

// helper function to get user by username
export function getUserByUsername(username: string, account: Account): User | null {
  const userList = initialiseUserList(account);

  for (const user of userList) {
    if (user?.username === username) {
      return user;
    }
  }

  return null;
}

// helper function to get all users
export function getAllUsers(account: Account): User[] {
  const userList = initialiseUserList(account);

  return userList.filter((user: User | null): user is User => user != null);
}

// helper function to check if username exists
export function usernameExists(username: string, account: Account): boolean {
  const userList = initialiseUserList(account)

  return userList.some(user => user && user.username === username)
}
