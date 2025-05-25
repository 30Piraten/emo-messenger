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
    meta: { requiresAuth: false }
  },
  {
    path: "/chat/:recipientId",
    name: "Chat",
    component: EmojiMessenger,
    props: true,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// navigation guard
router.beforeEach(async ( to, from, next ) => {
  const authStore = useAuthStore();

  // wait for Forebase auth to resolve
  if (!authStore.isAuthResolved) {
    // wait for auth state to be resolved
    await new Promise((resolve) => {
      const unwatch = authStore.$subscribe(() => {
        if (authStore.isAuthResolved) {
          unwatch();
          resolve(true);
        }
      });
    });
  }

  const isLoggedIn = !!authStore.user;

  // add first: && !authStore.user
  if (to.meta.requiresAuth && !isLoggedIn) {
    next({ name: "Home" })
  } else {
    next()
  }
})

export default router
