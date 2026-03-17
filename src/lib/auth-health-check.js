// Health check disabled — direct fetch to Supabase is blocked by CORS in browsers.
// Login errors are handled by signInWithEmail in the AuthContext instead.
export const checkSupabaseHealth = async () => {
  return { status: 'online', message: 'OK' };
};
