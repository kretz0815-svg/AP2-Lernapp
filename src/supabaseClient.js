import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://bvnjhvrgvebrjbizbssv.supabase.co';
const fallbackSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bmpodnJndmVicmpiaXpic3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzY0MzYsImV4cCI6MjA4NzcxMjQzNn0.6_OwrntdSBJesWHKqm_oKlJ4kXWbUalDrADA3rOK7gk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseKey;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
	console.warn('Supabase Env-Variablen fehlen. Nutze Fallback-Project. Setze VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env.local bzw. Vercel Environment Variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		// Require manual login after each app restart (no persisted session).
		persistSession: false,
		autoRefreshToken: false
	}
});
