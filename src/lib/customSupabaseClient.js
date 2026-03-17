import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://raykfnoptzzsdcvjupzf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWtmbm9wdHp6c2Rjdmp1cHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDkwMjcsImV4cCI6MjA4NTI4NTAyN30.hAAb2OLsdq4zPYQnKzzVYIVlDcGthhoIvIRMO-cUlvo';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
