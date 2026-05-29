// Edge function — fan out an "incoming call" push to a host's followers when a
// new live meet row is inserted. Wire this to a Database Webhook on meets INSERT
// (or call it directly). Mirrors the client-side notifyFollowersOfMeet fallback.
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { record } = await req.json()
  if (!record?.id || !record?.host_id || record?.is_live === false) {
    return new Response("skip")
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const [{ data: host }, { data: followers }] = await Promise.all([
    sb.from("users").select("username,display_name").eq("id", record.host_id).single(),
    sb.from("follows").select("follower_id").eq("following_id", record.host_id),
  ])

  const followerIds = (followers ?? []).map((f: any) => f.follower_id)
  if (followerIds.length === 0) return new Response("no followers")

  const { data: tokenRows } = await sb
    .from("users")
    .select("push_token")
    .in("id", followerIds)
    .not("push_token", "is", null)

  const tokens = (tokenRows ?? []).map((r: any) => r.push_token).filter(Boolean)
  if (tokens.length === 0) return new Response("no tokens")

  const hostName = host?.display_name || host?.username || "Someone"

  const messages = tokens.map((to: string) => ({
    to,
    title: `${hostName} is live`,
    body: `Tap to join "${record.name}"`,
    sound: "default",
    priority: "high",
    categoryId: "meet-incoming",
    interruptionLevel: "time-sensitive",
    data: { type: "meet-incoming", meetId: record.id, hostName, meetName: record.name },
  }))

  for (let i = 0; i < messages.length; i += 100) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages.slice(i, i + 100)),
    })
  }

  return new Response("ok")
})
