import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase.server";
export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.redirect(new URL("/auth/login", req.url));
  const form = await req.formData();
  const forumId = form.get("forumId") as string;
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("forum_id", forumId)
    .maybeSingle();
  if (existing)
    await supabase.from("subscriptions").delete().eq("id", existing.id);
  else
    await supabase
      .from("subscriptions")
      .insert({ user_id: session.user.id, forum_id: forumId });
  return NextResponse.redirect(req.headers.get("referer") ?? "/", {
    status: 303,
  });
}
