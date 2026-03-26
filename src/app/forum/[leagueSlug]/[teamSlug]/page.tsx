import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase.server";
import { ForumFeed } from "@/components/forum/ForumFeed";
import { ForumSidebarRight } from "@/components/forum/ForumSidebarRight";
import { SubscribeButton } from "@/components/forum/SubscribeButton";
import { MatchStatsWidget } from "@/components/stats/MatchStatsWidget";
import { TeamBadge } from "@/components/ui/TeamBadge";
import type { Metadata } from "next";

interface Props {
  params: { leagueSlug: string; teamSlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerComponentClient();
  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("slug", params.teamSlug)
    .single();
  return { title: team ? `${team.name} – Forum` : "Forum" };
}

export const dynamic = "force-dynamic";

export default async function ForumPage({ params }: Props) {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: team } = await supabase
    .from("teams")
    .select("*, league:leagues(*)")
    .eq("slug", params.teamSlug)
    .single();
  if (!team) notFound();

  const { data: forum } = await supabase
    .from("forums")
    .select("*")
    .eq("team_id", team.id)
    .single();
  if (!forum) notFound();

  let isSubscribed = false;
  let userAlias: string | null = null;
  if (session?.user) {
    const [{ data: sub }, { data: alias }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("forum_id", forum.id)
        .maybeSingle(),
      supabase
        .from("user_aliases")
        .select("alias")
        .eq("user_id", session.user.id)
        .eq("forum_id", forum.id)
        .maybeSingle(),
    ]);
    isSubscribed = !!sub;
    userAlias = (alias as { alias: string } | null)?.alias ?? null;
  }

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "*, author:profiles!author_id(id, username, default_alias, avatar_url, is_online, role), post_likes(user_id), post_reactions(emoji, user_id)",
    )
    .eq("forum_id", forum.id)
    .eq("title", "")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: moderators } = await supabase
    .from("forum_moderators")
    .select("*, profile:profiles(id, username, avatar_url, is_online)")
    .eq("forum_id", forum.id);

  const { data: nextFixture } = await supabase
    .from("fixtures")
    .select("*")
    .eq("team_id", team.id)
    .in("status", ["scheduled", "live"])
    .order("kickoff_at")
    .limit(1)
    .maybeSingle();

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const [{ data: topPost }, { count: initialTodayCount }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, author:profiles(id, username)")
      .eq("forum_id", forum.id)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString())
      .order("like_count", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("forum_id", forum.id)
      .eq("title", "")
      .gte("created_at", todayStart.toISOString()),
  ]);

  const postsClean = (posts || []).map((p: Record<string, unknown>) => ({
    ...p,
    user_liked: session?.user
      ? (p.post_likes as { user_id: string }[])?.some(
          (l) => l.user_id === session.user.id,
        )
      : false,
    reactions: p.post_reactions as { emoji: string; user_id: string }[],
    post_likes: undefined,
    post_reactions: undefined,
  }));

  const league = team.league as Record<string, unknown>;

  return (
    <div className="flex flex-col min-h-0">
      {/* Next match + rules bar */}
      {nextFixture && (
        <div className="flex items-center gap-3 px-4 py-2 bg-mp-s1 border-b border-mp-border text-xs flex-wrap">
          <span className="text-[9px] font-bold uppercase tracking-widest text-mp-t2">
            Nästa match
          </span>
          <span className="font-semibold text-mp-t1">
            {(nextFixture as Record<string, unknown>).home_team as string} vs{" "}
            {(nextFixture as Record<string, unknown>).away_team as string}
          </span>
          <span className="text-mp-red font-bold">
            {new Date(
              (nextFixture as Record<string, unknown>).kickoff_at as string,
            ).toLocaleDateString("sv-SE", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={undefined}
            className="ml-auto text-[10px] font-semibold text-mp-t2 hover:text-mp-t1 border border-mp-border rounded px-2 py-0.5"
            id="open-rules"
          >
            📋 Forumregler
          </button>
        </div>
      )}


      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="px-0 sm:px-4 py-4 w-full">
            {/* Back link */}
            <Link href={`/league/${params.leagueSlug}/${params.teamSlug}`}
              className="inline-flex items-center gap-1.5 text-sm text-mp-t2 hover:text-mp-t0 mb-3 transition-colors">
              ← Tillbaka till {team.name}
            </Link>
            {/* Forum header */}
            <div className="flex items-center gap-3 mb-4">
              <TeamBadge color={team.color} shortName={team.short_name ?? ''} size="md" />
              <div className="flex-1">
                <h1 className="font-display text-xl tracking-wide">
                  {team.name}
                </h1>
                <p className="text-xs text-mp-t1">
                  {league?.flag_emoji as string} {league?.name as string} ·{" "}
                  {league?.country as string}
                </p>
              </div>
              <SubscribeButton forumId={forum.id} initialSubscribed={isSubscribed} />
            </div>

            {/* Top post of the day */}
            {topPost && (
              <div className="bg-mp-s1 border border-mp-border rounded-xl p-4 mb-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-mp-amber to-mp-red" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">👑</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-mp-amber">
                    Dagens mest gillade
                  </span>
                </div>
                <div className="font-bold text-sm mb-1">
                  {(topPost as Record<string, unknown>).title as string}
                </div>
                <div className="text-xs text-mp-t1 line-clamp-2">
                  {(topPost as Record<string, unknown>).content as string}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-mp-t2">
                    {
                      (
                        (topPost as Record<string, unknown>).author as Record<
                          string,
                          unknown
                        >
                      )?.username as string
                    }
                  </span>
                  <span className="text-[11px] font-bold text-mp-pink ml-auto">
                    ♥{" "}
                    {(topPost as Record<string, unknown>).like_count as number}
                  </span>
                </div>
              </div>
            )}

            <ForumFeed
              initialPosts={postsClean as never[]}
              forum={{ id: forum.id }}
              session={session}
              userAlias={userAlias}
              isSubscribed={isSubscribed}
              initialTodayCount={initialTodayCount ?? 0}
            />
          </div>
        </div>

        {/* Right sidebar – hidden on mobile */}
        <div className="hidden lg:block w-64 flex-shrink-0 border-l border-mp-border overflow-y-auto p-4 space-y-4">
          <ForumSidebarRight
            forum={forum as never}
            moderators={(moderators || []) as never[]}
            nextFixture={nextFixture as never}
            session={session}
          />
          {nextFixture &&
            (nextFixture as Record<string, unknown>).status === "live" && (
              <MatchStatsWidget teamApiId={0} />
            )}
        </div>
      </div>
    </div>
  );
}
