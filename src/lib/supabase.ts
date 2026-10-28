import { createClient } from '@supabase/supabase-js';

const urlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
// O painel atual do Supabase chama a chave pública de "publishable"; projetos antigos usam "anon".
const keyEnv = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(urlEnv && keyEnv);

const supabaseUrl = urlEnv && urlEnv.startsWith("http") ? urlEnv : 'https://placeholder.supabase.co';
const supabaseKey = keyEnv && keyEnv.trim() !== "" ? keyEnv : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
