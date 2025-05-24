import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useUserStore = defineStore('users', () => {

  // ref is state properties
  const count = ref(0)

  // computed becomes getters
  const doubleCount = computed(() => count.value * 2)

  // function becomes action
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
