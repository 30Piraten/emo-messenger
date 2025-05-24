// import './assets/main.css'
import { createApp, defineComponent, h } from 'vue'
import { JazzProvider } from "jazz-vue";
import { createPinia } from 'pinia'
import App from './App.vue'

import { UserAccount } from '@/types/jazz';
import { customPasskeyAuth } from './auth/customPasskeyAuth';

// declare module for Jazz Vue integration
declare module "jazz-vue" {
  interface Register {
    Account: UserAccount
  }
}

// create root component with Jazz provider
const RootComponent = defineComponent({
  name: "RootComponent",
  setup() {
    return () =>
      h(
        JazzProvider as any,
        {
          AccountSchema: UserAccount,
          auth: customPasskeyAuth,
          peer: "wss://cloud.jazz.tools/?key=vue-todo-example-jazz@garden.co",
        },
        {
          default: () => h(App),
        }
      );
  }
})

const app = createApp(RootComponent);
app.use(createPinia())
app.mount('#app')
