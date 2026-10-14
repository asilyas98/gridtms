import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://durwofqudkmhxdxdfonl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_y-SvA_EmxZH_qrW8oGPM1g_kM472V6A';

const getEnv = (key: string): string | undefined => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch {}
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
};

const clean = (value?: string): string => (value || '').trim().replace(/^['"]|['"]$/g, '');
const validUrl = (value?: string): string => {
  const candidate = clean(value);
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? candidate : '';
  } catch {
    return '';
  }
};

// Never let a malformed deployment variable blank the entire application.
const supabaseUrl = validUrl(getEnv('VITE_SUPABASE_URL'))
  || validUrl(getEnv('NEXT_PUBLIC_SUPABASE_URL'))
  || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = clean(getEnv('VITE_SUPABASE_ANON_KEY'))
  || clean(getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'))
  || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
