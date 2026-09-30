import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ws polyfill is required for Node.js v20 (native WebSocket is Node 22+ only)
export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      realtime: { transport: WebSocket }
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);

if (isSupabaseConfigured) {
  console.log('✅ Supabase client initialized:', supabaseUrl);
} else {
  console.warn('⚠️  Supabase not configured — check SUPABASE_URL and keys in .env');
}
