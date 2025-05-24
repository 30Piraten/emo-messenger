import { defineStore } from "pinia";
import { ref } from "vue";
import { v4 as uuidv4 } from "uuid"

export const useAuthStore = defineStore("auth", () => {
  const user = ref<{ id: string; username: string } | null>(null);

  const login = (username: string) => {
    // user.value = { id: crypto.randomUUID(), username };
    user.value = { id: uuidv4(), username };
  };

  const logout = () => {
    user.value = null;
  };

  return { user, login, logout }
});
