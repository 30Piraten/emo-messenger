import { useAuthStore } from "@/stores/authStore";
import { createWebHistory, createRouter } from "vue-router";

import FormAuth from "@/components/FormAuth.vue";
import OnlineUsers from "@/components/OnlineUsers.vue";
import EmojiMessenger from "@/components/EmojiMessenger.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: FormAuth,
    meta: { requiresAuth: false }
  },
  {
    path: "/users",
    name: "Users",
    component: OnlineUsers,
    meta: { requiresAuth: true } // Changed to true - users should be logged in to see other users
  },
  {
    path: "/chat/:recipientId",
    name: "Chat",
    component: EmojiMessenger,
    props: true,
    meta: { requiresAuth: true }
  },
  // Redirect root to users if authenticated
  {
    path: "/dashboard",
    redirect: "/users"
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Enhanced navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Wait for Firebase auth to resolve
  if (!authStore.isAuthResolved) {
  await Promise.race([
    new Promise((resolve) => {
      const unwatch = authStore.$subscribe(() => {
        if (authStore.isAuthResolved) {
          unwatch();
          resolve(true);
        }
      });
    }),
    new Promise((resolve) => setTimeout(resolve, 5000)) // fallback in case of error
  ]);
}

  const isLoggedIn = !!authStore.user;

  // Handle authentication requirements
  if (to.meta.requiresAuth && !isLoggedIn) {
    next({ name: "Home" });
  } else if (to.name === "Home" && isLoggedIn) {
    // Redirect logged-in users away from login page
    next({ name: "Users" });
  } else {
    next();
  }
});

export default router;
