export type SignupOutcome = 'signed-in' | 'existing-account' | 'verify-email' | 'unknown';

interface SignupData {
  user: { identities?: readonly unknown[] } | null;
  session: unknown;
}

export function getSignupOutcome(data: SignupData): SignupOutcome {
  if (data.session) return 'signed-in';
  if (!data.user || !Array.isArray(data.user.identities)) return 'unknown';
  // Confirmed duplicates (and existing invitations) can return a sanitized user instead of an error.
  if (data.user.identities.length === 0) return 'existing-account';
  return 'verify-email';
}
