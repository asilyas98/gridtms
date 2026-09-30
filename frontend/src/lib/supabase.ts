import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://durwofqudkmhxdxdfonl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_y-SvA_EmxZH_qrW8oGPM1g_kM472V6A';

const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch {}
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
