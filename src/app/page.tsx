import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase.server";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { ForumOnlineCount } from "@/components/ui/ForumOnlineCount";
import { Star, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: leagues } = await supabase
    .from("leagues")
    .select("*")
    .eq("sport", "football")
    .neq("slug", "champions-league")
    .order("name");

  const { data: popular } = await supabase
    .from("forums")
    .select(
      "id, post_count, member_count, today_count, team:teams(name, short_name, color, slug, league:leagues(name, flag_emoji, slug))",
    )
    .order("member_count", { ascending: false })
    .limit(6);

  let subscriptions: unknown[] = [];
  if (session?.user) {
    const { data } = await supabase
      .from("subscriptions")
      .select(
        "id, forum:forums(id, team:teams(name, short_name, color, slug, league:leagues(name, flag_emoji, slug)))",
      )
      .eq("user_id", session.user.id);
    subscriptions = data || [];
  }

  // Compute today_count and post_count dynamically from posts table
  const popularForumIds = (popular || []).map(f => (f as Record<string,unknown>).id as string)
  const subForumIds = subscriptions.map(s => {
    const forum = (s as Record<string,unknown>).forum as Record<string,unknown>
    return forum?.id as string
  }).filter(Boolean)
  const allForumIds = Array.from(new Set([...popularForumIds, ...subForumIds]))

  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const { data: todayPostsData } = await supabase.from('posts').select('forum_id').eq('title','').in('forum_id', allForumIds.length ? allForumIds : ['__none__']).gte('created_at', todayStart.toISOString())
  const todayCounts: Record<string,number> = {}
  for (const p of todayPostsData ?? []) { todayCounts[p.forum_id] = (todayCounts[p.forum_id] ?? 0) + 1 }

  return (
    <div className="w-full px-0 sm:px-4 py-6">
      {/* Hero CTA for guests */}
      {!session && (
        <div className="relative mb-6 rounded-2xl overflow-hidden border border-mp-border">
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-mp-s1 via-mp-s2 to-mp-bg" />
          <div className="absolute inset-0 bg-gradient-to-r from-mp-red/10 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-mp-red/5 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-mp-blue/5 translate-y-1/2" />
          {/* Left red bar */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-mp-red via-mp-red/60 to-transparent" />

          <div className="relative px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-mp-red mb-2">Sveriges sportforum</p>
                <h2 className="font-display text-3xl sm:text-4xl tracking-wide leading-none mb-3">
                  GÅ MED I<br />
                  <span className="text-mp-red">DISKUSSIONEN</span>
                </h2>
                <p className="text-mp-t1 text-sm leading-relaxed max-w-sm">
                  Diskutera matcher, transfers och taktik med tusentals fans. Live-forum under match. Alltid gratis.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-xs text-mp-t2">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-mp-green flex-shrink-0" />Live matchforum</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-mp-blue flex-shrink-0" />Röstchatt</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-mp-amber flex-shrink-0" />Prenumerera på lag</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-shrink-0 w-full sm:w-auto">
                <Link href="/auth/register"
                  className="btn-primary px-5 py-2.5 text-sm font-bold text-center w-full sm:w-auto">
                  Skapa konto gratis
                </Link>
                <Link href="/auth/login"
                  className="btn-ghost px-5 py-2.5 text-sm text-center w-full sm:w-auto">
                  Logga in
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mina forum */}
      {session && subscriptions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="section-label flex items-center gap-1.5"><Star size={18} strokeWidth={1.75}/> Mina forum</h2>
            <Link
              href="/forum/popular"
              className="text-mp-red text-xs font-semibold hover:underline"
            >
              + Utforska fler
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subscriptions.map((sub: unknown) => {
              const s = sub as Record<string, unknown>;
              const forum = s.forum as Record<string, unknown>;
              const forumId = forum?.id as string;
              const team = forum?.team as Record<string, unknown>;
              const lg = team?.league as Record<string, unknown>;
              return (
                <Link
                  key={s.id as string}
                  href={`/forum/${lg?.slug}/${team?.slug}`}
                  className="flex items-center gap-3 bg-mp-s1 border border-mp-border rounded-xl p-4 hover:border-mp-red/40 active:scale-[0.99] transition-all group"
                >
                  <TeamBadge color={team?.color as string} shortName={team?.short_name as string} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">
                      {team?.name as string}
                    </div>
                    <div className="text-[10px] text-mp-t2">
                      {lg?.flag_emoji as string} {lg?.name as string}
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-mp-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-mp-green" />
                        <ForumOnlineCount forumId={forumId} /> online
                      </span>
                      {(todayCounts[forumId] ?? 0) > 0 && (
                        <span className="text-[10px] text-mp-red font-semibold">
                          {todayCounts[forumId]} inlägg idag
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-mp-t2 group-hover:text-mp-red text-xl transition-colors">
                    ›
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Leaderboard ad */}
      <div className="bg-mp-s2 border border-dashed border-mp-border rounded-lg h-14 flex items-center justify-center mb-6">
        <span className="text-[8px] font-bold tracking-widest text-mp-t2 uppercase">
          Annons – Leaderboard
        </span>
      </div>

      {/* Leagues */}
      <section className="mb-8">
        <h2 className="section-label mb-4 flex items-center gap-1.5"><i className="fa-regular fa-futbol text-sm"/> Fotboll – Ligor</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(leagues || []).map((lg: Record<string, unknown>) => (
            <Link
              key={lg.id as string}
              href={`/league/${lg.slug}`}
              className="bg-mp-s1 border border-mp-border rounded-xl p-4 text-center hover:border-mp-red hover:-translate-y-0.5 transition-all group"
            >
              <div className="text-3xl mb-2">{lg.flag_emoji as string}</div>
              <div className="text-xs font-bold">{lg.name as string}</div>
              <div className="text-[10px] text-mp-t2 mt-1">
                {lg.country as string}
              </div>
            </Link>
          ))}
          <div className="bg-mp-s1 border border-mp-border rounded-xl p-4 text-center opacity-40">
            <div className="text-3xl mb-2"><i className="fa-solid fa-hockey-puck"/></div>
            <div className="text-xs font-bold">SHL</div>
            <div className="text-[10px] text-mp-t2 mt-1">Snart</div>
          </div>
        </div>
      </section>

      {/* Popular forums */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-label flex items-center gap-1.5"><Flame size={18} strokeWidth={1.75}/> Populäraste forumen</h2>
          <Link
            href="/forum/popular"
            className="text-mp-red text-xs font-semibold hover:underline"
          >
            Se alla
          </Link>
        </div>
        <div className="space-y-2">
          {(popular || []).map((f: Record<string, unknown>) => {
            const team = f.team as Record<string, unknown>;
            const lg = team?.league as Record<string, unknown>;
            return (
              <Link
                key={f.id as string}
                href={`/forum/${lg?.slug}/${team?.slug}`}
                className="flex items-center gap-3 bg-mp-s1 border border-mp-border rounded-xl p-3 hover:border-mp-red/40 transition-all group"
              >
                <TeamBadge color={team?.color as string} shortName={team?.short_name as string} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">
                    {team?.name as string}
                  </div>
                  <div className="text-[10px] text-mp-t2">
                    {lg?.flag_emoji as string} {lg?.name as string}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-mp-green font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-mp-green" />
                    <ForumOnlineCount forumId={f.id as string} /> online
                  </span>
                  {(todayCounts[f.id as string] ?? 0) > 0 && (
                    <span className="text-[10px] text-mp-red font-semibold">
                      {todayCounts[f.id as string]} inlägg idag
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
