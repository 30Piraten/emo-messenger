<script setup lang="ts">
import { ref } from "vue";
import { userData } from "@/validators/userSchema"
import { useAuthStore } from "@/stores/authStore";
import bcrypt from "bcrypt"
import { saveUserToJazz, getUserByUsername } from "@/stores/jazzStorage";
import { useJazz } from "@/composables/useJazz";

const auth = useAuthStore();
const { account } = useJazz();

// form state
const username = ref("");
const password = ref("");
const formErrors = ref<{ username?: string; password?: string }>({});
const mode = ref<"signup" | "login">("signup");

const toggleMode = () => {
  mode.value = mode.value === "signup" ? "login" : "signup";
  formErrors.value = {};
};

const handleSubmit = async (e: Event) => {
  e.preventDefault();
  formErrors.value = {};

  const validateResult = userData.safeParse({
    username: username.value,
    password: password.value,
  });

  if (!validateResult.success) {
    const fieldErrors: typeof formErrors.value = {};
    validateResult.error.issues.forEach(issues => {
      const field = issues.path[0] as keyof typeof formErrors.value;
      fieldErrors[field] = issues.message;
    });
    formErrors.value = fieldErrors;
    return;
  }

  try {
    if (mode.value == "signup") {
      // hash the password and create the user
      const hashedPassword = await bcrypt.hash(validateResult.data.password, 10);
      const userToSave = {
        username: validateResult.data.username,
        password: hashedPassword,
      };

      const newUser = await saveUserToJazz(userToSave, account);
      auth.login(validateResult.data.username);
      console.log("user signed up:", newUser.username);

    } else {
      // login - verify existing user
      const existingUser = await getUserByUsername(validateResult.data.username, account);

      if (!existingUser) {
        formErrors.value.username = "user not found";
        return;
      }

      const isPasswordValid = await bcrypt.compare(
        validateResult.data.password,
        existingUser.password
      );

      if (!isPasswordValid) {
        formErrors.value.password = "invalid password";
        return;
      }

      auth.login(validateResult.data.username);
      console.log("user logged in:", existingUser.username);
    }

    // clear the form
    username.value = "";
    password.value = "";

  } catch (error) {
    console.log("authentication error:", error);
    if (error instanceof Error && error.message.includes("already exists")) {
      formErrors.value.username = "username already exists"
    } else {
      formErrors.value.username = "an error occured. Please try again";
    }
  }
};
</script>

<template>
  <h1 class="title">{{ mode === "signup" ? "Signup" : "Login" }} to EmoMessenger</h1>
  <div class="form-container">
    <form class="form" @submit="handleSubmit">

      <!-- for username -->
      <label for="username">Username</label>
      <input
        id="username"
        v-model="username"
        type="text"
        placeholder="enter your username"
        :aria-label="username"
        :aria-invalid="!!formErrors.username"
      />
      <span class="error" v-if="formErrors.username">{{ formErrors.username }}</span>

      <!-- for password -->
      <label for="password">Password</label>
      <input
        id="username"
        v-model="password"
        type="password"
        placeholder="enter your password"
        :aria-label="password"
        :aria-invalid="!!formErrors.username"
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
