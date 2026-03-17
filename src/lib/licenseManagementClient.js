import { supabase } from './customSupabaseClient';

/**
 * Calls the license-management-api edge function.
 * @param {string} action - The action to perform ('validate' or 'redeem').
 * @param {object} payload - The payload for the action (e.g., { key_code: '...' }).
 * @returns {Promise<any>} - The result from the edge function.
 */
export async function callLicenseApi(action, payload = {}) {
  try {
    const { data, error } = await supabase.functions.invoke('license-management-api', {
      body: { action, ...payload }
    });

    if (error) {
      console.error(`Error calling license-management-api (${action}):`, error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("License API Exception:", err);
    throw err;
  }
}

/**
 * Validates a license key.
 * @param {string} keyCode 
 */
export async function validateLicenseKey(keyCode) {
  return callLicenseApi('validate', { key_code: keyCode });
}

/**
 * Redeems a license key for the current user.
 * @param {string} keyCode 
 */
export async function redeemLicenseKey(keyCode) {
  return callLicenseApi('redeem', { key_code: keyCode });
}