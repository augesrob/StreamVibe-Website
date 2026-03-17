import { supabase } from '@/lib/customSupabaseClient';

export const checkSupabaseHealth = async () => {
  const HEALTH_TIMEOUT = 5000;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), HEALTH_TIMEOUT)
  );

  const checkPromise = async () => {
    // Use the supabase client's own URL — works regardless of env var naming
    const supabaseUrl = 'https://raykfnoptzzsdcvjupzf.supabase.co';
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWtmbm9wdHp6c2Rjdmp1cHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDkwMjcsImV4cCI6MjA4NTI4NTAyN30.hAAb2OLsdq4zPYQnKzzVYIVlDcGthhoIvIRMO-cUlvo' }
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return { status: 'online' };
  };

  try {
    await Promise.race([checkPromise(), timeoutPromise]);
    return { status: 'online', message: 'Service Operational' };
  } catch (error) {
    let message = 'Connection Failed';
    if (error.message === 'TIMEOUT') message = 'Connection Timeout (Latency High)';
    else if (error.message.includes('Failed to fetch')) message = 'Network Error';
    console.warn('[Supabase Health]', message);
    return { status: 'offline', message };
  }
};
