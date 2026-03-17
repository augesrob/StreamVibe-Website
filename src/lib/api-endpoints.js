
import { supabase } from '@/lib/customSupabaseClient';

// Updated Project ID for the new Supabase instance
export const PROJECT_ID = 'raykfnoptzzsdcvjupzf';
export const BASE_FUNCTIONS_URL = `https://${PROJECT_ID}.supabase.co/functions/v1`;

// Helper to extract Project ID
export const getSupabaseProjectId = () => {
  return PROJECT_ID;
};

// API Endpoints constants
export const API_ENDPOINTS = {
  // Core License API
  LICENSE_API: `${BASE_FUNCTIONS_URL}/license-api`,
  LICENSE_MANAGEMENT: `${BASE_FUNCTIONS_URL}/license-management-api`,
  LICENSE_REDEMPTION: `${BASE_FUNCTIONS_URL}/license-redemption-api`,
  
  // Auxiliary APIs
  TRIAL_KEYS: `${BASE_FUNCTIONS_URL}/trial-keys-api`,
  PLANS: `${BASE_FUNCTIONS_URL}/plans-api`,
  USER_LICENSES: `${BASE_FUNCTIONS_URL}/user-licenses-api`,
  ANALYTICS: `${BASE_FUNCTIONS_URL}/license-analytics-api`,
  BULK_OPS: `${BASE_FUNCTIONS_URL}/bulk-operations-api`,
  VALIDATION_RULES: `${BASE_FUNCTIONS_URL}/validation-rules-api`,
  ADMIN_CONTROLS: `${BASE_FUNCTIONS_URL}/admin-controls-api`,
  
  // Integrations
  DISCORD: `${BASE_FUNCTIONS_URL}/discord-api`,
  API_KEY_MGMT: `${BASE_FUNCTIONS_URL}/api-key-management-api`,
  
  // Legacy mappings
  VERIFY_LICENSE: `${BASE_FUNCTIONS_URL}/verify-license-key`, 
  REDEEM_LICENSE: `${BASE_FUNCTIONS_URL}/license-redemption-api`,
  PAYPAL_CAPTURE: `${BASE_FUNCTIONS_URL}/paypal-capture-order`,
};

export const getEdgeFunctionUrl = (functionName) => {
  return `${BASE_FUNCTIONS_URL}/${functionName}`;
};

export const getAuthHeaders = (token) => {
  return {
    'Authorization': `Bearer ${token || 'YOUR_TOKEN'}`,
    'Content-Type': 'application/json'
  };
};
