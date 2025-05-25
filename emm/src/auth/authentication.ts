// Authentication for user Sign In and Log In

import { auth } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

export const signupUser = async (email: string, password: string) => {
  const rr = await createUserWithEmailAndPassword(auth, email, password);
  return rr.user;
};

export const loginUser = async (email: string, password: string) => {
  const rr = await signInWithEmailAndPassword(auth, email, password);
  return rr.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};
