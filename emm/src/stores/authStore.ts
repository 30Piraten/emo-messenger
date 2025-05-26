import { defineStore } from "pinia";
import { ref } from "vue";
import { auth, firestoreDb } from "@/firebase";
import  { doc, serverTimestamp, setDoc } from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import router from "@/router/route";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<null | { uid: string; email: string | null; displayName?: string }>(null);
  const isAuthResolved = ref(false);

  // Sync with Firebase Auth
  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      setUser(firebaseUser);
      setUserOnline(firebaseUser.uid);
    } else {
      clearUser();
    }
    // mark auth as resolved after first check
    if (!isAuthResolved.value) {
      isAuthResolved.value = true;
    }
  });

  const setUser = (firebaseuser: User) => {
    const email = firebaseuser.email || "";
    user.value = {
      uid: firebaseuser.uid,
      email: firebaseuser.email,
      displayName: email.split("@")[0],
    };
  };
  const clearUser = () => {
    user.value = null;
  }

  // set user online status
  const setUserOnline = async (uid: string) => {
    try {
      await setDoc(
        doc(firestoreDb, "users", uid),
        {
          online: true,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );

      // set up offline detection
      window.addEventListener("beforeunload", () => setUserOnline(uid));

      // also handle tab visibility change
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          setOfflineUser(uid);
        } else {
          setUserOnline(uid);
        }
      });
    } catch(err) {
      console.error("failed to set user online", err)
    }
  }

  // set offline user
  const setOfflineUser = async (uid: string) => {
    try {
      await setDoc(
        doc(firestoreDb, "users", uid),
        {
          online: false,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );
    } catch(err) {
      console.error("failed to set user offline", err)
    }
  }

  const logout = async () => {
    const currentUser = auth.currentUser;

    try {
      if (currentUser) {
        await setOfflineUser(currentUser.uid)
      }
      await signOut(auth);
      router.push("/");
      clearUser();

    } catch(err) {
      console.error("logout failed", err)
    }
  };

  return { user, setUser, clearUser, logout, isAuthResolved, setUserOnline, setOfflineUser};
});

// persist and cache data to Firestore
export const saveUserProfile = async (uid: string, email: string ) => {
  try {
    const displayName = email.split("@")[0];

    await setDoc(
      doc(firestoreDb, "users", uid),
      {
        uid,
        email,
        displayName,
        online: true,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  } catch(error) {
    console.error("Failed to save user profile:", error);
    throw error;
  }
};
