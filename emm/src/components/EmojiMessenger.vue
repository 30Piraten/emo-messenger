<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter, useRoute } from "vue-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import { collection, addDoc, serverTimestamp, Timestamp, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { firestoreDb } from "@/firebase";

// props definition
const props = defineProps<{ recipientId: string }>();

// local state
const newMessage = ref("");
const loading = ref(false);

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  participants: string[];
  content: string;
  timestamp: Timestamp;
  readBy?: string[];
}

const messages = ref<Message[]>([]);

// refs & stores
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const currentUser = authStore.user;

console.log("Recipient ID:", props.recipientId);

// Firestore listeners
let unsubscribe: (() => void) | null = null;

const loadMessages = () => {
  if (!currentUser || !props.recipientId) return;

  const messageRef = collection(firestoreDb, "messages");
  const q = query(
    messageRef,
    where("participants", "array-contains", currentUser.uid),
    orderBy("timestamp", "asc")
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    messages.value = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Message ))
      // filter only msgs between these two users
      .filter((msg) =>
        Array.isArray(msg.participants) &&
        msg.participants.includes(currentUser.uid) &&
        msg.participants.includes(props.recipientId)
      );
  })
}

onMounted(() => loadMessages());
onUnmounted(() => unsubscribe?.());

watch(() => route.params.recipientId, (newId, oldId) => {
  if (newId !== oldId) {
    unsubscribe?.();
    loadMessages();
  }
});

// handle message send
const sendMessage = async () => {
  if (!newMessage.value.trim() || !currentUser) return;

  loading.value = true;

  try{
    await addDoc(collection(firestoreDb, "messages"), {
      senderId: currentUser.uid,
      recipientId: props.recipientId,
      participants: [currentUser.uid, props.recipientId],
      content: newMessage.value.trim(),
      timestamp: serverTimestamp(),
      readBy: [currentUser.uid] // mark sender as read
    });

    newMessage.value = "";

  } catch(err) {
    console.error("error sending message", err);
  } finally {
    loading.value = false;
  }
};

const leaveChat = () => {
  router.push("/users");
}
</script>

<template>
  <div class="messenger">
    <h2>Emo Chat 👾</h2>
    <p>Talking to: <code>{{ recipientId }}</code></p>

    <div class="messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message"
        :class="{ 'me': msg.senderId === currentUser?.uid }"
      >
        <div class="bubble">
          {{ msg.content }}
        </div>
        <div class="timestamp">
          {{ msg.timestamp?.seconds ? dayjs(msg.timestamp.toDate()).fromNow() : 'Sending' }}</div>
      </div>
    </div>

    <form @submit.prevent="sendMessage" class="send-box">
      <input
        type="text"
        v-model="newMessage"
        placeholder="type your message 💬"
        :disabled="loading"
      />
      <button type="submit" :disabled="loading">{{ loading ? 'Sending...' : 'Send' }}
      </button>
    </form>

    <button @click="leaveChat" class="emo-btn">leave EmoChat</button>
  </div>
</template>

<style scoped>
.emo-btn {
  margin-top: 10px;
}

.messenger {
  max-width: 500px;
  margin: 2rem auto;
  font-family: system-ui, sans-serif;
}

.messages {
  min-height: 200px;
  border: 1px solid #ddd;
  padding: 1em;
  margin-bottom: 1em;
  background: #fdfdfd;
  border-radius: 8px;
}

.message {
  margin: 0.5em 0;
  line-height: 1.4;
}

.timestamp {
  font-size: 0.8em;
  color: #666;
  margin-top: 0.2em;
}

.send-box {
  display: flex;
  gap: 0.5em;
}

input {
  flex: 1;
  padding: 0.6em;
  font-size: 1.1em;
}

button {
  background: black;
  color: white;
  border: none;
  padding: 0.6em 1em;
  font-size: 1em;
  cursor: pointer;
  min-width: 80px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
