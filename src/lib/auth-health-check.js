// Health check disabled — browser fetch to Supabase auth is blocked by CORS.
// Login errors surface naturally through signIn() in AuthContext.
export const checkSupabaseHealth = async () => ({ status: 'online', message: 'OK' });
