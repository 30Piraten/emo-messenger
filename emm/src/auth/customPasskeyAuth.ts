import { UserAccount, UserProfile } from "@/types/jazz";
import { client } from "@passwordless-id/webauthn";

export const customPasskeyAuth: () => Promise<UserAccount> = async () => {
  // --- optional: restore from localStorage
  const stored = localStorage.getItem('jazz-account');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const restored = await UserAccount.load(parsed.id);
      if (restored) return restored;
    } catch (err) {
      console.warn('Session restore failed:', err);
    }
  }

  // --- step 1: get challenge from server
  const challenge = await fetch('/api/auth/challenge', {
    method: 'POST',
  }).then(res => res.text());

  // --- step 2: trigger authentication
  const credentials = await client.authenticate({ challenge });

  // --- step 3: send credentials to server to verify
  const verifyRes = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!verifyRes.ok) {
    throw new Error('Authentication failed.');
  }

  const { username } = await verifyRes.json();

  // --- step 4: create Jazz account
  const account = await UserAccount.create({
    profile: UserProfile.create({ username, name: username }),
    userList: [],
  });

  // --- step 5: persist account ID for session restoration
  localStorage.setItem('jazz-account', JSON.stringify({ id: account.id }));

  return account;
}
