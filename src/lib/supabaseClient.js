// src/lib/supabaseClient.js
//
// One shared Supabase client for the whole app. Everything else
// (login, fetching jobs/leads, etc.) imports this rather than creating
// its own connection.
//
// Install first:
//   npm install @supabase/supabase-js
//
// Then create a .env file in your project root (never commit this):
//   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-public-key
//
// Both values come from Supabase dashboard → Project Settings → API.
// The "anon" key is safe to expose in front-end code — it only has the
// permissions your Row Level Security policies grant it. Never put the
// "service_role" key here; that one stays server-side only (Edge Functions).

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
