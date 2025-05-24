<script setup lang="ts">
import { ref } from "vue"

const encodeEmojis = (text: string) => text.split("").map(c => "")
</script>

<template>
  <div>
    <form action="">
      <textarea name="message" id="message"></textarea>
      <input
        type="text"
        name="textarea"
        id="textarea"
      />
    </form>
  </div>
</template>

<style scoped>

</style>
