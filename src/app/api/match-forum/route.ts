import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase.server";
export async function GET(req: NextRequest) {
  const supabase = createServerComponentClient();
  const forumId = req.nextUrl.searchParams.get("forumId");
  if (!forumId)
    return NextResponse.json({ error: "Missing forumId" }, { status: 400 });
  const { data } = await supabase
    .from("match_forums")
    .select("*, fixture:fixtures(*)")
    .eq("forum_id", forumId)
    .in("status", ["pending", "active", "closed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ matchForum: data });
}
export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient();
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const results: string[] = [];
  const { data: liveFixtures } = await supabase
    .from("fixtures")
    .select("id, team_id")
    .eq("status", "live");
  for (const fx of liveFixtures || []) {
    const { data: forum } = await supabase
      .from("forums")
      .select("id")
      .eq("team_id", fx.team_id)
      .maybeSingle();
    if (!forum) continue;
    const { data: mf } = await supabase
      .from("match_forums")
      .select("id,status")
      .eq("fixture_id", fx.id)
      .maybeSingle();
    if (!mf) {
      await supabase
        .from("match_forums")
        .insert({
          forum_id: forum.id,
          fixture_id: fx.id,
          status: "active",
          opened_at: now.toISOString(),
        });
      results.push(`Activated ${fx.id}`);
    } else if (mf.status === "pending") {
      await supabase
        .from("match_forums")
        .update({ status: "active", opened_at: now.toISOString() })
        .eq("id", mf.id);
      results.push(`Opened ${mf.id}`);
    }
  }
  const { data: doneFixtures } = await supabase
    .from("fixtures")
    .select("id")
    .eq("status", "finished");
  for (const fx of doneFixtures || []) {
    const cleanup = new Date(now.getTime() + 12 * 3600000).toISOString();
    const { data: mf } = await supabase
      .from("match_forums")
      .select("id,status")
      .eq("fixture_id", fx.id)
      .eq("status", "active")
      .maybeSingle();
    if (mf) {
      await supabase
        .from("match_forums")
        .update({
          status: "closed",
          closed_at: now.toISOString(),
          cleanup_at: cleanup,
        })
        .eq("id", mf.id);
      results.push(`Closed ${mf.id}`);
    }
  }
  const { data: expired } = await supabase
    .from("match_forums")
    .select("id")
    .eq("status", "closed")
    .lt("cleanup_at", now.toISOString());
  for (const mf of expired || []) {
    await supabase
      .from("match_forum_posts")
      .delete()
      .eq("match_forum_id", mf.id);
    await supabase
      .from("match_forums")
      .update({ status: "cleaned" })
      .eq("id", mf.id);
    results.push(`Cleaned ${mf.id}`);
  }
  return NextResponse.json({ ok: true, results });
}
