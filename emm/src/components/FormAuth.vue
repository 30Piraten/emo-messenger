<script setup lang="ts">
import { ref } from "vue";
import { signupUser, loginUser } from "@/auth/authentication";
import { saveUserProfile, useAuthStore } from "@/stores/authStore";
import { useRouter } from 'vue-router'
import { z } from "zod/v4"

// form state
const email = ref("")
const password = ref("");
const formErrors = ref<{ email?: string, password?: string; general?: string }>({});
const mode = ref<"signup" | "login">("signup");

const router = useRouter()
const authStore = useAuthStore();

const toggleMode = () => {
  mode.value = mode.value === "signup" ? "login" : "signup";
  formErrors.value = {};
};

const AuthSchema = z.strictObject({
  email:  z.email({ pattern: z.regexes.html5Email, error: "Enter a valid email address" }),
  password: z.string().min(6, { error: "Password must be at least 6 characters" }),
});

const handleSubmit = async (e: Event) => {
  e.preventDefault();
  formErrors.value = {};

  const rr = AuthSchema.safeParse({ email: email.value, password: password.value });

  if (!rr.success) {
    rr.error.issues.forEach(err => {
      if (err.path[0] === "email") formErrors.value.email = err.message;
      if (err.path[0] === "password") formErrors.value.password = err.message;
    });
    return;
  }

  if (Object.keys(formErrors.value).length) return;

  try {
    const userCredentials = mode.value === "signup"
      ? await signupUser(email.value, password.value)
      : await loginUser(email.value, password.value);

    // persit email to Firestore (opt. extend with displayName)
    if (mode.value == "signup") await saveUserProfile(userCredentials.uid, email.value)
    console.log("user profile saved to Firestore")

    // userCredentials is already a type of user
    authStore.setUser(userCredentials);
    email.value = "";
    password.value = "";

    // TODO: must redirect to online users
    // redirection after user sign's up or login
    router.push("/users")

  } catch (err: any) {
    console.error(err);

    switch (err.code) {
      case "auth/email-already-in-use":
      formErrors.value.email = "Email already in use";
      break;
    case "auth/user-not-found":
      formErrors.value.email = "User not found";
      break;
    case "auth/wrong-password":
      formErrors.value.password = "Incorrect password";
      break;
    default:
      formErrors.value.general = "Something went wrong. Please try again."
    }
  };
}
</script>

<template>
  <h1 class="title">{{ mode === "signup" ? "Signup" : "Login" }} to EmoMessenger</h1>
  <div class="form-container">
    <form class="form" @submit="handleSubmit">

      <!-- for email -->
      <label for="email">Email</label>
      <input
        id="email"
        v-model="email"
        type="text"
        placeholder="your@email.com"
        :aria-label="email"
        :aria-invalid="!!formErrors.email"
        autocomplete="email"
      />
      <span class="error" v-if="formErrors.email">{{ formErrors.email }}</span>

      <!-- for password -->
      <label for="password">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        placeholder="🧪 🎛️ 📝 ❤️ ☎️ 💡"
        :aria-label="password"
        :aria-invalid="!!formErrors.password"
        autocomplete="current-password"
      />
      <span class="error" v-if="formErrors.password">{{ formErrors.password }}</span>

       <!-- Submit -->
      <button class="submit-button" type="submit">
        {{ mode === "signup" ? "Sign Up" : "Log In" }}
      </button>

      <!-- Toggle mode -->
      <button class="switch-mode" type="button" @click="toggleMode">
        Switch to {{ mode === "signup" ? "Login" : "Signup" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.title {
  color: red;
  font-size: 2em;
  margin-bottom: 1em;

  /* will need to modify */
  text-align: center;
}
.form-container {
  max-width: 400px;
  margin: auto;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1em;
}
input {
  padding: 0.5em;
  font-size: 1em;
}
.error {
  color: crimson;
  font-size: 0.9em;
  margin-top: -0.5em;
}
.switch-mode {
  background-color: black;
  color: white;
  padding: 0.5em;
  font-size: 1em;
  cursor: pointer;
  border: 1px solid #ccc;
}
</style>
