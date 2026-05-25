/** Vrai si l'app tourne en mode local (sans Supabase). */
export const IS_LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

/** ID de l'utilisateur courant en mode local — quand Supabase sera branché, on lira la session. */
export const CURRENT_USER_ID = 'local-user';
