<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { firestoreDb } from "@/firebase";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

interface MessageNotifications {
  id: string;
  senderId: string;
  senderDisplayName: string;
  senderEmail: string;
  content: string;
  timestamp: Timestamp;
  readBy: string[];
  unreadCount: number;
}

// state
const notifications = ref<MessageNotifications[]>([]);
const loading = ref(true)

// stores & router
const authStore = useAuthStore();
const router = useRouter();

let unsubscribe: (() => void) | null = null;

// load incoming message notifications
const loadNotifications = () => {
  if (!authStore.user) return;

  const messageRef = collection(firestoreDb, "messages");
  // Fixed query: Get all messages for this recipient, then filter in code
  const q = query(
    messageRef,
    where("recipientId", "==", authStore.user.uid),
    orderBy("timestamp", "desc")
  );

  unsubscribe = onSnapshot(q, async (snapshot) => {
    const rawMessages = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
      const messageData = docSnapshot.data();

      // Filter out messages that are already read by current user
      const readBy = messageData.readBy || [];
      if (readBy.includes(authStore.user!.uid)) {
        return null; // Skip read messages
      }

      // Get sender info
      const senderDoc = await getDoc(doc(firestoreDb, "users", messageData.senderId));
      if (!senderDoc.exists()) return null;

      const senderData = senderDoc.data();

      return {
        id: docSnapshot.id,
        senderId: messageData.senderId,
        senderDisplayName: senderData.displayName || senderData.email?.split("@")[0] || "😒",
        senderEmail: senderData.email || "",
        content: messageData.content,
        timestamp: messageData.timestamp,
        readBy: messageData.readBy || [],
      } as MessageNotifications;
    }));

    const filteredMessages = rawMessages.filter(Boolean) as MessageNotifications[];

    // 🧠 Group by senderId
    const grouped: Record<string, MessageNotifications[]> = {};
    for (const msg of filteredMessages) {
      if (!grouped[msg.senderId]) grouped[msg.senderId] = [];
      grouped[msg.senderId].push(msg);
    }

    // 🧱 Create grouped summaries with correct unread count
    const summarized = Object.values(grouped).map(messages => {
      const latest = messages.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)[0];
      return {
        ...latest,
        unreadCount: messages.length, // This will be the actual unread count
      };
    });

    notifications.value = summarized;
    loading.value = false;
  });
};

// reply to a message (opens a private chat)
const replyToMessage = async (notification: MessageNotifications) => {
  try {
    // Mark all unread messages from this sender as read
    await markMessagesAsReadFromSender(notification.senderId);

    // Navigate to chat
    router.push(`/chat/${notification.senderId}`);
  } catch (err) {
    console.error("Error marking messages as read:", err);
  }
};

// mark as read without replying
const markAsRead = async (notification: MessageNotifications) => {
  try {
    await markMessagesAsReadFromSender(notification.senderId);
  } catch (err) {
    console.error("Error marking messages as read:", err);
  }
};

// Helper function to mark all messages from a sender as read
const markMessagesAsReadFromSender = async (senderId: string) => {
  if (!authStore.user) return;

  const q = query(
    collection(firestoreDb, "messages"),
    where("recipientId", "==", authStore.user.uid),
    where("senderId", "==", senderId)
  );

  const snapshot = await getDocs(q);

  // Filter and update only unread messages
  const updatePromises = snapshot.docs
    .filter(docSnap => {
      const readBy = docSnap.data().readBy || [];
      return !readBy.includes(authStore.user!.uid);
    })
    .map(docSnap => {
      return updateDoc(doc(firestoreDb, "messages", docSnap.id), {
        readBy: arrayUnion(authStore.user!.uid)
      });
    });

  await Promise.all(updatePromises);
};

// get avatar initials
const getInitials = (name: string) => {
  return name ? name.slice(0, 3).toLowerCase() : "📺";
};

onMounted(() => {
  loadNotifications();
});

onUnmounted(() => {
  unsubscribe?.();
});

watch(
  () => authStore.user,
  (user) => {
    if (user) loadNotifications();
  },
  { immediate: true }
);
</script>

<template>
  <div class="notifications-container">
    <h3 class="notifications-header">📮 Message Request</h3>

    <div v-if="loading" class="loading">
      <p>loading notifications...</p>
    </div>
    <div v-else-if="notifications.length === 0" class="no-notifications">
      <p>No new message request</p>
    </div>

    <div v-else class="notifications-list">
      <div v-for="notification in notifications" :key="notification.id" class="notification-item">
        <div class="notification-avatar">
          {{ getInitials(notification.senderDisplayName) }}
        </div>

        <div class="notification-content">
          <div class="notification-header">
            <span class="sender-name">
              {{ notification.senderDisplayName }}
              <span class="unread-count" v-if="notification.unreadCount">({{ notification.unreadCount }})</span>
            </span>
            <span class="timestamp">
              {{ notification.timestamp?.seconds ? dayjs(notification.timestamp.toDate()).fromNow() : "Just now" }}
            </span>
          </div>

          <div class="message-preview">
            {{ notification.content.length > 50 ? notification.content.substring(0, 50)  + "..." : notification.content }}
          </div>

          <div class="notification-actions">
            <button @click="replyToMessage(notification)" class="reply-btn">
              💬 Reply
            </button>
            <button @click="markAsRead(notification)" class="mark-read-btn">
              ✅ Mark Read
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-container {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1rem;
  margin: 1rem 0;
  max-height: 400px;
  overflow-y: auto;
}

.notifications-header {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.loading, .no-notifications {
  text-align: center;
  color: #6c757d;
  padding: 1rem;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.notification-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 4px rgba(0,123,255,0.1);
}

.notification-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.sender-name {
  font-weight: 600;
  color: #2c3e50;
}

.timestamp {
  font-size: 0.75rem;
  color: #6c757d;
}

.message-preview {
  color: #495057;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.notification-actions {
  display: flex;
  gap: 0.5rem;
}

.reply-btn, .mark-read-btn {
  padding: 0.25rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reply-btn {
  background: #007bff;
  color: white;
}

.reply-btn:hover {
  background: #0056b3;
}

.mark-read-btn {
  background: #6c757d;
  color: white;
}

.mark-read-btn:hover {
  background: #545b62;
}
</style>
