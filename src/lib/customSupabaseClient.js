import { createClient } from '@supabase/supabase-js';

// Support both VITE_ and NEXT_PUBLIC_ prefixes (Vercel uses NEXT_PUBLIC_*)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ugodapqlmajfhvrodlyf.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2RhcHFsbWFqZmh2cm9kbHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjIxNzQsImV4cCI6MjA4ODU5ODE3NH0.LjDDwzac0264ao2PppV2jB5Q1WyACylWyqlgv8ISUfA';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;
export { customSupabaseClient, customSupabaseClient as supabase };
