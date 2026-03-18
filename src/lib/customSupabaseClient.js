import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ugodapqlmajfhvrodlyf.supabase.co';
const supabaseAnonKey = 'sb_publishable_O-yx6QEJ7yuiEhJlUpJ5qw_ig6knme4';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
