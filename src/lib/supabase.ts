import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isValidUrl = (url: string | undefined) => {
    try {
        return url && new URL(url);
    } catch (e) {
        return false;
    }
};

export const supabase = (isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key_here')
    ? createClient(supabaseUrl!, supabaseAnonKey)
    : null;
