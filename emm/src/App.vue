<script setup lang="ts">
import Auth from "./components/FormAuth.vue"
import { useAccount } from "jazz-vue";
import { defineComponent, provide } from "vue";
import { JazzAccountKey } from "@/composables/useJazz";
import FormAuth from "@/components/FormAuth.vue";

defineComponent({
  name: "App",
  components: {
    FormAuth,
  },

  setup() {
    // get Jazz account from provider
    const account = useAccount();

    // provide account to child components
    provide(JazzAccountKey, account);

    return {
      account,
    };
  }
})

</script>

<template>
  <main>
    <div id="app">
      <FormAuth v-if="account" />

    </div>
    <Auth />
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
