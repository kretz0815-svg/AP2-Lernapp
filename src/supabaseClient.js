import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bvnjhvrgvebrjbizbssv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bmpodnJndmVicmpiaXpic3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzY0MzYsImV4cCI6MjA4NzcxMjQzNn0.6_OwrntdSBJesWHKqm_oKlJ4kXWbUalDrADA3rOK7gk';

export const supabase = createClient(supabaseUrl, supabaseKey);
