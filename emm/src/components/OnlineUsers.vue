<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { collection, where, query, onSnapshot, Timestamp } from 'firebase/firestore';
import { firestoreDb } from '@/firebase';
import dayjs from 'dayjs';
import MessageNotification from './MessageNotification.vue';
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  online: boolean;
  lastSeen: Timestamp;
}

// state
const users = ref<UserProfile[]>([]);
const loading =  ref(true);
const router = useRouter();
const authStore = useAuthStore();
const currentUser = authStore.user

// fetch users from Firestore -> exclude self
const fetchUsers = async () => {
  if (!currentUser) return;

  // made changes here
    try {
      const q = query(
        collection(firestoreDb, "users"),
        // where("uid", "!=", currentUser.uid)
      );

      // TODO: review why spread (...doc.data()) cant be used
      onSnapshot(q, (snapshot) => {
        users.value = snapshot.docs
          .map((doc) => doc.data() as UserProfile)
          .filter((user) => user.uid !== currentUser.uid);

        // sort users: online first, then by last seen
        users.value.sort((a, b) => {
          if (a.online && !b.online) return -1;
          if (!a.online && b.lastSeen) return 1;

          // if both online or both offline, sort by last seen
          if (a.lastSeen && b.lastSeen) return b.lastSeen.seconds - a.lastSeen.seconds
          return 0
        });

        loading.value = false;

      });

    } catch(err) {
      console.error("failed to list users:", err)
      loading.value = false;
    }
  };

onMounted(() => {
  fetchUsers();
});

const getInitials = (email: string) => {
  return email ? email.slice(0, 2).toLowerCase() : "😒";
};

const getLastSeenText = (user: UserProfile) => {
  if (user.online) return "Online";
  if (user.lastSeen?.seconds) return `Last seen ${dayjs(user.lastSeen.toDate()).fromNow()}`;
  return "Last seen recently";
}

const startChat = (user: UserProfile) => {
  if (router.currentRoute.value.params.recipientId === user.uid) return;
  router.push(`/chat/${user.uid}`);
};


const handleLogout = async () => {
  await authStore.logout();
  router.push("/");
};
</script>

<template>
  <!-- <MessageNotification /> -->

  <div class="main-container">
    <!-- User List Section -->
    <div class="user-container">
      <div class="user-header-section">
        <h1 class="user-header">👥 Users</h1>
        <div class="current-user-info" v-if="currentUser">
          <span class="current-user-name">{{ currentUser.displayName || currentUser.email }}</span>
          <span class="online-indicator">🟢 Online</span>
        </div>
      </div>

      <p v-if="loading" class="loading-text">Loading users...</p>

      <ul v-else class="user-list">
        <li
          v-for="user in users"
          :key="user.uid"
          class="user-list-item"
          @click="startChat(user)"
        >
          <div class="user-info">
            <span class="avatar">{{ getInitials(user.displayName) }}</span>
            <div class="user-details">
              <span class="user-name">{{ user.displayName }}</span>
              <span class="user-status" :class="{ 'online': user.online, 'offline': !user.online }">
                {{ getLastSeenText(user) }}
              </span>
            </div>
          </div>
          <span class="status-dot" :class="user.online ? 'online' : 'offline'">●</span>
        </li>
      </ul>

      <div class="user-actions">
        <button @click="handleLogout" class="logout-btn">🚪 Log Out</button>
      </div>
    </div>

    <!-- Message Notifications Section -->
    <div class="notifications-section">
      <MessageNotification />
    </div>
  </div>
</template>

<style scoped>
.main-container {
  display: flex;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.user-container {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  height: fit-content;
}

.notifications-section {
  flex: 1;
  min-width: 300px;
}

.user-header-section {
  margin-bottom: 1.5rem;
}

.user-header {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.current-user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #e8f5e8;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.current-user-name {
  font-weight: 600;
  color: #2c3e50;
}

.online-indicator {
  font-size: 0.8rem;
  color: #28a745;
}

.loading-text {
  text-align: center;
  color: #6c757d;
  padding: 2rem;
}

.user-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f9fa;
}

.user-list-item:hover {
  background: #e3f2fd;
  border-color: #2196f3;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(33,150,243,0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1rem;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1rem;
}

.user-status {
  font-size: 0.8rem;
  font-weight: 500;
}

.user-status.online {
  color: #28a745;
}

.user-status.offline {
  color: #6c757d;
}

.status-dot {
  font-size: 1.2rem;
  margin-left: auto;
  transition: transform 0.2s ease;
}

.user-list-item:hover .status-dot {
  transform: scale(1.2);
}

.status-dot.online {
  color: #28a745;
}

.status-dot.offline {
  color: #dc3545;
}

.user-actions {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.logout-btn {
  width: 100%;
  padding: 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.logout-btn:hover {
  background: #c82333;
}

/* Responsive Design */
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
    padding: 0.5rem;
  }

  .notifications-section {
    min-width: unset;
  }
}
</style>
