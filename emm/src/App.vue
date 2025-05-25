<script setup lang="ts">
import { useAuthStore } from "@/stores/authStore";

const  authStore = useAuthStore();
</script>

<template>
  <main>
    <RouterView  v-if="authStore.isAuthResolved" />
  </main>
</template>

<style scoped>
main {
  padding: 2rem;
}
</style>
