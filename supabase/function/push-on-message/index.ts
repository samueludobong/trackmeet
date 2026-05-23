import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { record } = await req.json()
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  const { data: conv } = await sb.from("conversations").select("user_a,user_b").eq("id", record.conversation_id).single()
  if (!conv) return new Response("no conv")

  const receiverId = conv.user_a === record.sender_id ? conv.user_b : conv.user_a
  const [{ data: receiver }, { data: sender }] = await Promise.all([
    sb.from("users").select("push_token").eq("id", receiverId).single(),
    sb.from("users").select("username,display_name").eq("id", record.sender_id).single(),
  ])
  if (!receiver?.push_token) return new Response("no token")

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: receiver.push_token,
      title: sender?.display_name || sender?.username || "New message",
      body: record.type === "spotify_track" ? "🎵 Shared a track" : record.body,
      data: { conversationId: record.conversation_id },
    }),
  })
  return new Response("ok")
})