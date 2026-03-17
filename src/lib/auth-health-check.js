
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Checks if the Supabase Authentication service is reachable and operational.
 * Uses a timeout to prevent hanging requests.
 * Updated to verify connectivity with new project.
 */
export const checkSupabaseHealth = async () => {
  const HEALTH_TIMEOUT = 5000; // 5 seconds

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), HEALTH_TIMEOUT)
  );

  const checkPromise = async () => {
    try {
      // Use env vars which should now point to the correct Supabase instance
      const authUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;
      
      const response = await fetch(authUrl, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      // Also try a lightweight DB ping to ensure data service is also up
      // We select from a public table if possible, or just check if the query throws a network error immediately.
      // We use the 'plans' table which is publicly readable.
      const { error: dbError } = await supabase.from('plans').select('id').limit(1).maybeSingle();
      
      if (dbError && (dbError.code === undefined || dbError.message?.includes('fetch'))) {
         // This indicates a network level failure rather than a permission/logic error
         throw new Error(`DB Connection Error: ${dbError.message}`);
      }

      return { status: 'online' };
    } catch (error) {
      throw error;
    }
  };

  try {
    await Promise.race([checkPromise(), timeoutPromise]);
    return { status: 'online', message: 'Service Operational' };
  } catch (error) {
    let status = 'offline';
    let message = 'Connection Failed';
    let detail = error.message;

    if (error.message === 'TIMEOUT') {
      message = 'Connection Timeout (Latency High)';
    } else if (error.message.includes('521')) {
      message = 'Service Down (521)';
      detail = 'The Supabase instance appears to be offline or restarting.';
    } else if (error.message.includes('Failed to fetch')) {
      message = 'Network Error (CORS/Offline)';
      detail = 'Could not reach the server. Check your internet connection.';
    }

    console.warn('[Supabase Health]', message, detail);
    return { status, message, detail };
  }
};
