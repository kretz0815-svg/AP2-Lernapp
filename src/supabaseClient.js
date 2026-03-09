import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';

const { url, anonKey } = CONFIG.supabase;

export const supabase = createClient(url, anonKey);
