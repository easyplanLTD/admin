/ supabase/functions/reset-password/index.ts
//
// Lets an owner/staff member reset another live account's password to a new
// temporary one, on the spot -- for when the self-service "Forgot password"
// email flow (Login's supabase.auth.resetPasswordForEmail call in App.jsx)
// is down, delayed, or the person just can't get to that inbox right now.
//
// Why this has to be an Edge Function rather than something the browser
// does directly: setting another person's password requires the
// service_role key (full admin rights), which must never be shipped to a
// browser. This function holds that key server-side, checks that whoever
// is calling it is already an owner/staff member, and then does the
// privileged work on their behalf. Same shape as create-user for that reason.
//
// The temp password is generated here (never chosen by staff, never logged)
// and returned once in the response -- staff relay it to the person
// directly (call/text). The account is forced through the same
// "set your own password" screen a brand-new temp-password account gets on
// first login, via profiles.must_change_password, so the temp password
// can't linger as their real one.
//
// Deploy with:  supabase functions deploy reset-password
//
// Called from FixFlow like:
//   const { data, error } = await supabase.functions.invoke('reset-password', {
//     body: { userId }
//   })

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Browsers preflight cross-origin POSTs (FixFlow's domain calling the
// *.supabase.co function domain) with an OPTIONS request before sending the
// real one. Without these headers the browser blocks the actual request
// before it ever reaches this function -- same reasoning as create-user.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// A temp password that's easy to read aloud or type over the phone --
// avoids visually-ambiguous characters (0/O, 1/l/I) -- while still clearing
// Supabase's 8-character minimum with a mix of case and digits.
function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const callerJwt = authHeader.replace(/^Bearer /i, "");
  if (!callerJwt) return json({ error: "Missing Authorization header" }, 401);

  // Service-role client: full admin rights, used only after we've verified
  // the caller below. Never returned to the client, never logged.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the caller is who their JWT claims, then check their role.
  const { data: callerData, error: callerErr } = await admin.auth.getUser(callerJwt);
  if (callerErr || !callerData?.user) return json({ error: "Invalid session" }, 401);

  const { data: callerProfile, error: profileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .single();

  if (profileErr || !callerProfile || !["owner", "staff"].includes(callerProfile.role)) {
    return json({ error: "Only owner/staff accounts can reset another account's password" }, 403);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { userId } = body || {};
  if (!userId) return json({ error: "userId is required" }, 400);

  const { data: targetProfile, error: targetErr } = await admin
    .from("profiles")
    .select("id, email, name, archived_at")
    .eq("id", userId)
    .single();

  if (targetErr || !targetProfile) return json({ error: "Account not found" }, 404);
  // Archived accounts can't log in anyway (both apps sign them out / block
  // sign-in once archived_at is set) -- resetting the password wouldn't let
  // them back in, so this would just be confusing. Restore first.
  if (targetProfile.archived_at) {
    return json({ error: "That account is archived -- restore it first, then reset the password." }, 400);
  }

  const tempPassword = generateTempPassword();

  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });
  if (updateErr) return json({ error: updateErr.message }, 400);

  // Best-effort: the password reset itself already succeeded above even if
  // this fails, so we still return the temp password -- just with a warning
  // that they won't be automatically prompted to change it on next login.
  const { error: flagErr } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);

  return json({
    userId,
    email: targetProfile.email,
    tempPassword,
    message:
      "Share this temporary password with them directly. They'll be asked to set their own the moment they log in.",
    ...(flagErr
      ? { warning: `Password was reset, but couldn't force a password-change prompt on next login: ${flagErr.message}` }
      : {}),
  });
});
