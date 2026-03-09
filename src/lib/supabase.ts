import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ugodapqlmajfhvrodlyf.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_O-yx6QEJ7yuiEhJlUpJ5qw_ig6knme4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
