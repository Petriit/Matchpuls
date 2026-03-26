import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase.server";
import { avatarColor, formatDate, formatDateFull, formatNumber } from "@/lib/utils";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { Heart, MessageCircle, Calendar, Users, Star } from "lucide-react";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { ForumMemberList } from "@/components/ui/ForumMemberList";
import { AliasEditor } from "@/components/ui/AliasEditor";
import type { AliasRow } from "@/components/ui/AliasEditor";
import { GLOBAL_BADGES, type GlobalBadgeStats } from "@/lib/globalBadges";
import { SyncBadgesButton } from "@/components/ui/SyncBadgesButton";
import { ChangePasswordForm } from "@/components/ui/ChangePasswordForm";

export const metadata = { title: "Min sida" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createServerComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", session.user.id).single();

  const p = profile as Record<string, unknown>;
  const username = (p?.username as string) ?? session.user.user_metadata?.username ?? "Okänd";
  const avatarBg = avatarColor(username);
  const accountAgeDays = Math.floor((Date.now() - new Date((p?.joined_at as string) ?? session.user.created_at).getTime()) / (1000 * 60 * 60 * 24));

  // Fetch all data in parallel
  const [
    { data: subs }, // includes forum.id for today counts
    { count: tacticPosts },
    { count: voiceSessions },
    { count: commentCount },
    { data: aliases },
    { data: recentPosts },
  ] = await Promise.all([
    supabase.from("subscriptions")
      .select("id, forum:forums(id, team:teams(name, short_name, color, slug, league:leagues(name, flag_emoji, slug)))")
      .eq("user_id", session.user.id),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", session.user.id).eq("tag", "tactic"),
    supabase.from("voice_participants").select("*", { count: "exact", head: true }).eq("user_id", session.user.id),
    supabase.from("comments").select("*", { count: "exact", head: true }).eq("author_id", session.user.id),
    supabase.from("user_aliases")
      .select("*, forum:forums(id, team:teams(name, short_name, color, slug))")
      .eq("user_id", session.user.id),
    supabase.from("posts")
      .select("id, content, like_count, comment_count, created_at, forum:forums(team:teams(name, slug, league:leagues(slug)))")
      .eq("author_id", session.user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  // Global badges
  const stats: GlobalBadgeStats = {
    postCount: (p?.post_count as number) ?? 0,
    likeCount: (p?.like_count as number) ?? 0,
    subCount: subs?.length ?? 0,
    accountAgeDays,
    tacticPosts: tacticPosts ?? 0,
    voiceSessions: voiceSessions ?? 0,
    commentCount: commentCount ?? 0,
  };
  const evaluatedBadges = GLOBAL_BADGES.map(b => ({ ...b, earned: b.id === "secret_night" ? false : b.check(stats) }));
  const earnedCount = evaluatedBadges.filter(b => b.earned).length;

  // Forum badge data
  const aliasForumIds = (aliases || []).map(a => ((a as Record<string, unknown>).forum as Record<string, unknown>)?.id as string).filter(Boolean);
  const { data: earnedBadgesRaw } = aliasForumIds.length
    ? await supabase.from("user_forum_badges").select("forum_id, badge_id").eq("user_id", session.user.id).in("forum_id", aliasForumIds)
    : { data: [] as { forum_id: string; badge_id: string }[] };

  const earnedByForum: Record<string, string[]> = {};
  for (const b of earnedBadgesRaw ?? []) {
    earnedByForum[b.forum_id] = [...(earnedByForum[b.forum_id] ?? []), b.badge_id];
  }
  const progressByForum: Record<string, Record<string, number>> = {};
  await Promise.all(
    aliasForumIds.map(async fid => {
      const { data } = await supabase.rpc("get_forum_badge_progress", { p_user_id: session.user.id, p_forum_id: fid });
      if (data) progressByForum[fid] = data as Record<string, number>;
    })
  );

  // Today counts for aside
  const subForumIds = (subs || []).map(s => ((s as Record<string,unknown>).forum as Record<string,unknown>)?.id as string).filter(Boolean)
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const { data: todayPostsData } = subForumIds.length
    ? await supabase.from('posts').select('forum_id').eq('title','').in('forum_id', subForumIds).gte('created_at', todayStart.toISOString())
    : { data: [] as { forum_id: string }[] }
  const todayCounts: Record<string,number> = {}
  for (const tp of todayPostsData ?? []) { todayCounts[tp.forum_id] = (todayCounts[tp.forum_id] ?? 0) + 1 }

  // Forum list for popover on own profile
  const memberForums = (subs ?? []).map(s => {
    const f = (s as Record<string,unknown>).forum as Record<string,unknown>
    const t = f?.team as Record<string,unknown>
    const lg = t?.league as Record<string,unknown>
    return { name: t?.name as string, short_name: t?.short_name as string, color: t?.color as string, teamSlug: t?.slug as string, leagueSlug: lg?.slug as string, leagueName: lg?.name as string, flag_emoji: lg?.flag_emoji as string }
  }).filter(f => f.teamSlug)

  return (
    <div className="w-full px-0 sm:px-4 py-4 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-start">

        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Profile card */}
          <div className="bg-mp-s1 border border-mp-border rounded-2xl p-5 relative">
            <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, ${avatarBg} 0%, transparent 60%)` }} />
            <div className="relative flex items-start gap-4">
              <AvatarUpload userId={session.user.id} username={username} currentAvatarUrl={(p?.avatar_url as string) ?? null} />
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl sm:text-3xl tracking-wide leading-none">{username}</h1>
                  {(p?.badge as string) && <span className="text-xl leading-none">{p.badge as string}</span>}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-mp-t2 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar size={11}/> Medlem sedan {formatDateFull((p?.joined_at as string) ?? session.user.created_at)}</span>
                  <ForumMemberList count={subs?.length ?? 0} forums={memberForums}/>
                </div>
              </div>
            </div>
            <div className="relative grid grid-cols-3 gap-2 mt-4">
              {[
                { n: (p?.post_count as number) ?? 0, l: "Inlägg",      col: "text-mp-blue"  },
                { n: (p?.like_count as number) ?? 0, l: "Gillningar",  col: "text-mp-red"   },
                { n: commentCount ?? 0,              l: "Kommentarer", col: "text-mp-green" },
              ].map(s => (
                <div key={s.l} className="bg-mp-bg border border-mp-border rounded-xl p-2.5 text-center">
                  <div className={`font-display text-xl tracking-wide ${s.col}`}>{formatNumber(s.n)}</div>
                  <div className="text-[10px] text-mp-t2 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Global badges */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-label"><i className="fa-solid fa-medal fa-xl"/> MÄRKEN</h2>
              <div className="flex items-center gap-3">
                <SyncBadgesButton forumIds={aliasForumIds} />
                <span className="text-xs text-mp-t2">{earnedCount}/{GLOBAL_BADGES.length} upplåsta</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {evaluatedBadges.map(b => (
                <div key={b.id}
                  title={b.earned ? `${b.name}: ${b.description}` : b.secret ? "???" : b.description}
                  className={`bg-mp-s1 border border-mp-border rounded-xl p-3 text-center transition-all ${b.earned ? "opacity-100" : "opacity-25 grayscale"}`}>
                  <div className="text-2xl mb-1 leading-none">{b.secret && !b.earned ? "❓" : b.emoji}</div>
                  <div className="text-[10px] font-bold text-mp-t1 leading-tight">{b.secret && !b.earned ? "???" : b.name}</div>
                  {b.earned && <div className="text-[8px] text-mp-t2 mt-0.5 leading-tight">{b.description}</div>}
                </div>
              ))}
            </div>
          </section>

          {/* Alias & Forum badges */}
          {aliases && aliases.length > 0 && (
            <section>
              <h2 className="section-label mb-3"><i className="fa-solid fa-pencil fa-xl"/> ALIAS & FORUM-MÄRKEN</h2>
              <AliasEditor
                aliases={(aliases as Record<string, unknown>[]).map((a): AliasRow => {
                  const f = a.forum as Record<string, unknown>;
                  const t = f?.team as Record<string, unknown> | null;
                  return {
                    id: a.id as string,
                    alias: a.alias as string,
                    forum_id: f?.id as string ?? "",
                    selected_badge: (a.selected_badge as string | null) ?? null,
                    team: t ? { name: t.name as string, short_name: t.short_name as string, color: t.color as string } : null,
                  };
                })}
                earnedByForum={earnedByForum}
                progressByForum={progressByForum}
                userId={session.user.id}
              />
            </section>
          )}

          {/* Recent posts */}
          {recentPosts && recentPosts.length > 0 && (
            <section>
              <h2 className="section-label mb-3"><i className="fa-solid fa-comment-dots fa-xl"/> SENASTE INLÄGG</h2>
              <div className="space-y-2">
                {(recentPosts as Record<string, unknown>[]).map(post => {
                  const f = post.forum as Record<string, unknown>;
                  const t = f?.team as Record<string, unknown>;
                  const lg = t?.league as Record<string, unknown>;
                  return (
                    <Link key={post.id as string} href={`/forum/${lg?.slug}/${t?.slug}`}
                      className="flex items-start gap-3 p-3 bg-mp-s1 border border-mp-border rounded-xl hover:border-mp-red/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-mp-t1 line-clamp-2">{post.content as string}</p>
                        <div className="text-xs text-mp-t2 mt-1">{t?.name as string} · {formatDate(post.created_at as string)}</div>
                      </div>
                      <div className="flex gap-3 text-xs flex-shrink-0">
                        <span className="flex items-center gap-1 text-mp-red"><Heart size={12} fill="currentColor"/> {post.like_count as number}</span>
                        <span className="flex items-center gap-1 text-mp-t1"><MessageCircle size={12}/> {post.comment_count as number}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Change password */}
          <ChangePasswordForm />

          <form action="/auth/logout" method="POST">
            <button type="submit" className="btn-ghost w-full">Logga ut</button>
          </form>
        </div>

        {/* ── Aside ── */}
        <aside className="w-full md:w-64 md:flex-shrink-0 space-y-4">
          <div className="hidden md:flex bg-mp-s2 border border-dashed border-mp-border rounded-xl h-36 items-center justify-center">
            <span className="text-xs font-bold tracking-widest text-mp-t2 uppercase">Annons</span>
          </div>

          <div className="bg-mp-s1 border border-mp-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-mp-t2 uppercase tracking-widest flex items-center gap-1.5">
                <Star size={14} strokeWidth={1.75}/> Mina forum
              </h3>
              <span className="text-xs text-mp-red font-bold">{subs?.length ?? 0}</span>
            </div>
            {!subs || subs.length === 0 ? (
              <p className="text-xs text-mp-t2 text-center py-3">Inga forum än</p>
            ) : (
              <div className="space-y-1">
                {(subs as Record<string, unknown>[]).map(sub => {
                  const f = sub.forum as Record<string, unknown>;
                  const forumId = f?.id as string;
                  const t = f?.team as Record<string, unknown>;
                  const lg = t?.league as Record<string, unknown>;
                  return (
                    <Link key={sub.id as string} href={`/forum/${lg?.slug}/${t?.slug}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-mp-s2 transition-colors group">
                      <TeamBadge color={(t?.color as string) ?? "#e8304a"} shortName={(t?.short_name as string) ?? ""} size="sm"/>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate group-hover:text-mp-t0">{t?.name as string}</div>
                        <div className="text-[10px] text-mp-t2">{lg?.flag_emoji as string} {lg?.name as string}</div>
                      </div>
                      {(todayCounts[forumId] ?? 0) > 0 && (
                        <span className="text-[10px] text-mp-red font-bold flex-shrink-0">{todayCounts[forumId]}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
            <Link href="/forum/popular" className="block text-center text-xs text-mp-red font-semibold mt-3 hover:underline">
              + Utforska fler forum
            </Link>
          </div>

          <div className="bg-mp-s2 border border-dashed border-mp-border rounded-xl h-52 flex items-center justify-center">
            <span className="text-xs font-bold tracking-widest text-mp-t2 uppercase">Annons</span>
          </div>
        </aside>

      </div>
    </div>
  );
}
