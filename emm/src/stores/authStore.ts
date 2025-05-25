import { defineStore } from "pinia";
import { ref } from "vue";
import { auth, firestoreDb } from "@/firebase";
import  { doc, serverTimestamp, setDoc } from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import router from "@/router/route";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<null | { uid: string; email: string | null }>(null);
  const isAuthResolved = ref(false);

  // Sync with Firebase Auth
  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      setUser(firebaseUser);
    } else {
      clearUser();
    }
    // mark auth as resolved after first check
    if (!isAuthResolved.value) {
      isAuthResolved.value = true;
    }
  });
  const setUser = (firebasuser: User) => {
    user.value = {
      uid: firebasuser.uid,
      email: firebasuser.email,
    };
  };
  const clearUser = () => {
    user.value = null;
  }
  //line 38 -
    const logout = async () => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      await setDoc(
        doc(firestoreDb, "users", currentUser.uid),
        {
          online: false,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );
    }

    await signOut(auth);
    router.push("/");
    clearUser();
  };
  // line end

  return { user, setUser, clearUser, logout, isAuthResolved};
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
        createdAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch(error) {
    console.error("Failed to save user profile:", error);
    throw error;
  }
};
