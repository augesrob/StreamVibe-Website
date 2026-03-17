import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { getEdgeFunctionUrl } from '@/lib/api-endpoints';

/**
 * Constructs a valid Supabase Edge Function URL.
 * @param {string} functionName 
 * @returns {string}
 */
export const constructFunctionUrl = (functionName) => getEdgeFunctionUrl(functionName);

/**
 * Calls a Supabase Edge Function with a timeout wrapper and error handling.
 * @param {string} functionName - The name of the edge function to invoke.
 * @param {Object} options - Options for the request.
 * @param {Object} options.body - The request body (will be JSON stringified).
 * @param {Object} options.headers - Custom headers.
 * @param {number} options.timeout - Timeout in milliseconds (default: 10000).
 * @returns {Promise<{data: any, error: any}>}
 */
export async function callEdgeFunctionWithTimeout(functionName, { body = {}, headers = {}, timeout = 10000 } = {}) {
  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timed out')), timeout);
  });

  try {
    console.log(`[Edge] Invoking ${functionName}...`);
    
    // Race the invocation against the timeout
    const { data, error } = await Promise.race([
      supabase.functions.invoke(functionName, {
        body,
        headers,
      }),
      timeoutPromise
    ]);

    if (error) {
        throw error; // Throw to be caught by catch block
    }

    return { data, error: null };
  } catch (error) {
    console.error(`[Edge] Function '${functionName}' failed:`, error);
    
    // Determine if it was a timeout or other error
    const isTimeout = error.message === 'Request timed out';
    const message = isTimeout 
        ? "Request timed out. Please try again." 
        : (error.message || "An unexpected error occurred");

    // Only show toast for network/system errors, logical errors might be handled by caller
    // But for safety in admin actions, showing toast is often good.
    if (isTimeout) {
      toast({
        variant: "destructive",
        title: "Timeout",
        description: message
      });
    }

    return { data: null, error: { message } };
  }
}