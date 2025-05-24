import { inject, type InjectionKey } from "vue";
import type { UserAccount } from "@/types/jazz";

// Injection key for the Jazz account provided by the parent
export const JazzAccountKey: InjectionKey<UserAccount> = Symbol("JazzAccount");

/**
 * Composable for accessing the current Jazz account.
 *
 * This assumes that a provider component (e.g. JazzProvider)
 * has already provided the JazzAccountKey via provide().
 */
export function useJazz(): { account: UserAccount } {
  const account = inject(JazzAccountKey);

  if (!account) {
    throw new Error("Jazz account not found. Make sure JazzProvider is set up correctly.");
  }

  return { account };
}
