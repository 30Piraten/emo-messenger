<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter, useRoute } from "vue-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { firestoreDb } from "@/firebase";

// Props definition
const props = defineProps<{
  recipientId: string
}>();

// Local state
const newMessage = ref("");
const loading = ref(false);
const recipientInfo = ref<{ displayName: string; email: string; online: boolean } | null>(null);

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

// Refs & stores
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const currentUser = authStore.user;

// Firestore listeners
let messagesUnsubscribe: (() => void) | null = null;
let recipientUnsubscribe: (() => void) | null = null;

// Load recipient info
const loadRecipientInfo = () => {
  if (!props.recipientId) return;

  const recipientRef = doc(firestoreDb, "users", props.recipientId);
  recipientUnsubscribe = onSnapshot(recipientRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      recipientInfo.value = {
        displayName: data.displayName || data.email?.split('@')[0] || 'Unknown User',
        email: data.email || '',
        online: data.online || false
      };
    }
  });
};

// Load messages between current user and recipient
const loadMessages = () => {
  if (!currentUser || !props.recipientId) {
    console.log("Missing currentUser or recipientId:", {
      currentUser: !!currentUser,
      recipientId: props.recipientId
    });
    return;
  }

  const messageRef = collection(firestoreDb, "messages");
  const q = query(
    messageRef,
    where("participants", "array-contains", currentUser.uid),
    orderBy("timestamp", "asc")
  );

  messagesUnsubscribe = onSnapshot(q, (snapshot) => {
    messages.value = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Message))
      // Filter messages between these two users only
      .filter((msg) =>
        Array.isArray(msg.participants) &&
        msg.participants.includes(currentUser.uid) &&
        msg.participants.includes(props.recipientId)
      );

    console.log("Loaded messages:", messages.value.length);

    // Mark messages as read when viewing
    markMessagesAsRead();
  });
};

// Mark incoming messages as read
const markMessagesAsRead = async () => {
  if (!currentUser) return;

  const unreadMessages = messages.value.filter(msg =>
    msg.senderId !== currentUser.uid &&
    (!msg.readBy || !msg.readBy.includes(currentUser.uid))
  );

  for (const message of unreadMessages) {
    try {
      const messageRef = doc(firestoreDb, "messages", message.id);
      await updateDoc(messageRef, {
        readBy: arrayUnion(currentUser.uid)
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  }
};

// Computed property for message grouping by date
const groupedMessages = computed(() => {
  const groups: { [key: string]: Message[] } = {};

  messages.value.forEach(message => {
    if (message.timestamp?.seconds) {
      const date = dayjs(message.timestamp.toDate()).format('YYYY-MM-DD');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    }
  });

  return groups;
});

// Format date for group headers
const formatDateHeader = (dateStr: string) => {
  const date = dayjs(dateStr);
  const today = dayjs();
  const yesterday = today.subtract(1, 'day');

  if (date.isSame(today, 'day')) return 'Today';
  if (date.isSame(yesterday, 'day')) return 'Yesterday';
  return date.format('MMMM D, YYYY');
};

onMounted(() => {
  loadRecipientInfo();
  loadMessages();
});

onUnmounted(() => {
  messagesUnsubscribe?.();
  recipientUnsubscribe?.();
});

// Watch for route changes
watch(() => props.recipientId, (newId, oldId) => {
  console.log("RecipientId changed:", { newId, oldId });
  if (newId !== oldId && newId) {
    messagesUnsubscribe?.();
    recipientUnsubscribe?.();
    loadRecipientInfo();
    loadMessages();
  }
});

// Handle message send
const sendMessage = async () => {
  if (!newMessage.value.trim() || !currentUser || !props.recipientId) {
    console.log("Cannot send message:", {
      hasMessage: !!newMessage.value.trim(),
      hasUser: !!currentUser,
      hasRecipient: !!props.recipientId
    });
    return;
  }

  loading.value = true;

  try {
    await addDoc(collection(firestoreDb, "messages"), {
      senderId: currentUser.uid,
      recipientId: props.recipientId,
      participants: [currentUser.uid, props.recipientId],
      content: newMessage.value.trim(),
      timestamp: serverTimestamp(),
      readBy: [currentUser.uid] // mark sender as read
    });

    newMessage.value = "";
    console.log("Message sent successfully");

  } catch(err) {
    console.error("Error sending message:", err);
  } finally {
    loading.value = false;
  }
};

// Handle Enter key for sending
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

const leaveChat = () => {
  router.push("/users");
};

// Check if message is read by recipient
const isMessageRead = (message: Message) => {
  return message.readBy && message.readBy.includes(props.recipientId);
};
</script>

<template>
  <div class="messenger">
    <!-- Chat Header -->
    <div class="chat-header">
      <button @click="leaveChat" class="back-btn">← Back</button>
      <div class="recipient-info" v-if="recipientInfo">
        <div class="recipient-avatar">
          {{ recipientInfo.displayName.slice(0, 2).toUpperCase() }}
        </div>
        <div class="recipient-details">
          <h2 class="recipient-name">{{ recipientInfo.displayName }}</h2>
          <span class="recipient-status" :class="{ 'online': recipientInfo.online }">
            {{ recipientInfo.online ? '🟢 Online' : '🔴 Offline' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div class="messages-container">
      <div v-if="Object.keys(groupedMessages).length === 0" class="no-messages">
        <p>👋 Start your conversation!</p>
      </div>

      <div v-else class="messages">
        <div v-for="(dayMessages, date) in groupedMessages" :key="date">
          <!-- Date Header -->
          <div class="date-header">
            {{ formatDateHeader(String(date)) }}
          </div>

          <!-- Messages for this date -->
          <div
            v-for="msg in dayMessages"
            :key="msg.id"
            class="message"
            :class="{ 'me': msg.senderId === currentUser?.uid }"
          >
            <div class="message-bubble">
              <div class="message-content">{{ msg.content }}</div>
              <div class="message-meta">
                <span class="timestamp">
                  {{ msg.timestamp?.seconds ? dayjs(msg.timestamp.toDate()).format('h:mm A') : 'Sending...' }}
                </span>
                <span v-if="msg.senderId === currentUser?.uid" class="read-status">
                  {{ isMessageRead(msg) ? '✓✓' : '✓' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message Input -->
    <form @submit.prevent="sendMessage" class="send-box">
      <div class="input-container">
        <textarea
          v-model="newMessage"
          placeholder="Type your message... (Press Enter to send)"
          :disabled="loading"
          @keydown="handleKeyPress"
          rows="1"
          class="message-input"
        ></textarea>
        <button
          type="submit"
          :disabled="loading || !props.recipientId || !newMessage.trim()"
          class="send-btn"
        >
          {{ loading ? '📤' : '🚀' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.messenger {
  display: flex;
  flex-direction: column;
  height: 50vh;
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.back-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.back-btn:hover {
  background: rgba(255,255,255,0.3);
}

.recipient-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.recipient-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
}

.recipient-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.recipient-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.recipient-status {
  font-size: 0.85rem;
  opacity: 0.9;
}

.recipient-status.online {
  color: #90EE90;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f8f9fa;
}

.no-messages {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #6c757d;
  font-size: 1.1rem;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.date-header {
  text-align: center;
  font-size: 0.8rem;
  color: #6c757d;
  margin: 1rem 0;
  position: relative;
}

.date-header::before,
.date-header::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 45%;
  height: 1px;
  background: #dee2e6;
}

.date-header::before {
  left: 0;
}

.date-header::after {
  right: 0;
}

.message {
  display: flex;
  margin-bottom: 0.5rem;
}

.message.me {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 18px;
  word-wrap: break-word;
}

.message:not(.me) .message-bubble {
  background: white;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.message.me .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-content {
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  opacity: 0.8;
}

.message:not(.me) .message-meta {
  color: #6c757d;
}

.read-status {
  color: #90EE90;
  font-weight: bold;
}

.send-box {
  padding: 1rem;
  background: white;
  border-top: 1px solid #e9ecef;
}

.input-container {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #e9ecef;
  border-radius: 20px;
  resize: none;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.4;
  max-height: 100px;
  transition: border-color 0.2s ease;
}

.message-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
}

.message-input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.send-btn {
  width: 45px;
  height: 45px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

/* Scrollbar styling */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Responsive Design */
@media (max-width: 768px) {
  .messenger {
    height: 100vh;
    border-radius: 0;
  }

  .message-bubble {
    max-width: 85%;
  }

  .chat-header {
    padding: 1rem;
  }

  .recipient-name {
    font-size: 1.1rem;
  }
}
</style>
