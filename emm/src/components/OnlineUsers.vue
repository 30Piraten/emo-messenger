<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { collection, getDoc, getDocs, where, query, onSnapshot } from 'firebase/firestore';
import { firestoreDb } from '@/firebase';
import type { UserProfile } from 'firebase/auth';

// state
const users = ref<any[]>([]);
const loading =  ref(true);

const router = useRouter();
const authStore = useAuthStore();
const currentUser = authStore.user

// fetch users from Firestore -> exclude self
const fetchUsers = async () => {
  if (!currentUser) return;

  // made changes here
    try{
      const q = query(
        collection(firestoreDb, "users"),
        where("uid", "!=", currentUser.uid)
      );

      onSnapshot(q, (snapshot) =>{
        users.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        loading.value = false;
      });
    } catch(err) {
      console.error("failed to list users:", err)
      loading.value = false;
    }
  }

onMounted(() => {
  fetchUsers();
})

const getInitials = (email: string) => {
  return email ? email.slice(0, 3).toUpperCase() : "😒";
};

// const goToChat = (uid: string) => {
//   router.push(`/chat/${uid}`);
// };

const startChat = (user: any) => {
  router.push(`/chat/${user.uid}`);
};

const handleLogout = async () => {
  await authStore.logout();
  router.push("/");
};
</script>

<template>
  <div class="user-container">
    <h1 class="user-header">Users</h1>

    <!-- can add goToChat(user.uid) in li if needed -->
    <p v-if="loading">Loading users...</p>
    <ul v-else class="user-list">
      <li
        v-for="user in users"
        :key="user.id"
        class="user-list-item"
      >
      <span class="avatar">{{ getInitials(user.email) }}</span>
      <span class="status" :class="user.online ? 'online' : 'offline'"> ● </span>
      <span>{{ user.displayName  || user.email }}</span> <button @click="startChat(user)">Start Chat</button>
    </li>
    </ul>

    <!-- TODO: needs review -> class name -->
    <div class="gotochat-container">
      <button @click="handleLogout">Log Out</button>
    </div>
  </div>
</template>

<style scoped>
.user-container {
  padding: 2rem;
}

.user-header {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.user-list {
  list-style: none;
  padding: 0;
}

.user-item {
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: #f3f3f3;
  margin-bottom: 0.5rem;
  transition: background 0.2s ease;
}
.user-item:hover {
  background: #e0e0e0;
}

.logout-container {
  margin-top: 2rem;
}
</style>
