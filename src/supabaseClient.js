import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error(
        'Supabase Env-Variablen fehlen! ' +
        'Setze VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env.local bzw. Vercel Environment Variables.'
    );
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
    auth: {
        // Require manual login after each app restart (no persisted session).
        persistSession: false,
        autoRefreshToken: false
    }
});