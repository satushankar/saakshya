/**
 * Evaluation access for reviewers opening the public prototype link.
 *
 * These credentials are PUBLIC ON PURPOSE: they are printed on the sign-in screen so a
 * judge can open the link and use the app without being issued an account. The blast
 * radius is bounded by row-level security (supabase/002_auth_rls.sql): this officer can
 * read and insert only its own records, and nothing can be updated or deleted.
 *
 * A field deployment issues accounts per officer and ships without this card.
 */
export const DEMO_ACCOUNT = {
  email: 'demo@saakshya.app',
  password: 'saakshya-demo-2026',
} as const;

/** Operator id recorded when a reviewer chooses the no-account, this-device-only path. */
export const LOCAL_DEMO_OFFICER_ID = 'DEMO-LOCAL';
