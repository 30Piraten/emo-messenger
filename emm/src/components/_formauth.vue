<script setup lang="ts">
import { ref } from "vue";
import { userData } from "@/validators/userSchema"
import { useAuthStore } from "@/stores/authStore";
import bcrypt from "bcrypt"
import { saveUserToJazz, getUserByUsername } from "@/stores/jazzStorage";
import { uuidv4 } from "zod/v4";
import { useJazz } from "@/composables/useJazz";

const auth = useAuthStore();

// form state
const username = ref("");
const password = ref("");
const formErrors = ref<{ username?: string; password?: string }>({});

// toggle mode: login or signup
const mode = ref<"signup" | "login">("signup")

//

const handleSubmit = async (e: Event) => {
  e.preventDefault();

  const rr = userData.safeParse({
    username: username.value,
    password: password.value,
  });

  if (!rr.success) {
    // map Zod issues to field-specific errors
    const fieldErrors: typeof formErrors.value = {};
    rr.error.issues.forEach(issue => {
      const field = issue.path[0] as keyof typeof formErrors.value;
      fieldErrors[field] = issue.message;
    });
    formErrors.value = fieldErrors;
    return
  }

  // hash function placeholder (using bcrypt)
  const hashPassword = await bcrypt.hash(rr.data.password, 10);

  // build the user object (Jazz assumes backend will add ID)
  const userToSave = {
    id: uuidv4(),
    username: rr.data.username,
    password: hashPassword,
  };

  // save to Jazz
  await saveUserToJazz(userToSave);

  if (mode.value === "signup") {
    auth.login(rr.data.username);
    console.log("Signed up:", { ...rr.data, password: hashPassword });
  } else {
    auth.login(rr.data.username);
    console.log("Logged in:", rr.data)
  }

  // why?
  console.log("user saved", userToSave);
}
</script>

<template>
  <h1 class="title">{{ mode === "signup" ? "Signup" : "Login" }} to EmoMessenger</h1>
  <div class="form-container">
    <form class="form" @submit="handleSubmit">

      <!-- for username -->
      <label for="username">Username</label>
      <input
        v-model="username"
        type="text"
        placeholder="enter your username"
        id="username"
        :aria-label="username"
        :aria-invalid="!!formErrors.username"
      />
      <span class="error" v-if="formErrors.username">{{ formErrors.username }}</span>

      <!-- for password -->
      <label for="password">Password</label>
      <input
        v-model="password"
        type="text"
        placeholder="enter your password"
        id="username"
        :aria-label="password"
        :aria-invalid="!!formErrors.username"
      />
      <span class="error" v-if="formErrors.password">{{ formErrors.password }}</span>

      <!-- need to define button name for sigup and login -->
      <button @click="mode = mode === 'signup' ? 'login' : 'signup'" class="switch-mode" type="submit">Switch to {{ mode === "signup" ? "Login" : "Signup" }}
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
