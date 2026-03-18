import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS, admin use only
// Never expose this in client-facing code outside admin-gated components
const supabaseUrl = 'https://ugodapqlmajfhvrodlyf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2RhcHFsbWFqZmh2cm9kbHlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAyMjE3NCwiZXhwIjoyMDg4NTk4MTc0fQ.fMKQvXXt_W9DTbS6qjiuo5Sfq67sRT1UD1FpvpYBxc4';

export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
