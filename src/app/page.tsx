import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase.server";
import { TeamBadge } from "@/components/ui/TeamBadge";
import { ForumOnlineCount } from "@/components/ui/ForumOnlineCount";
import { Star, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerComponentClient();
  const { data: { session } } = await supabase.auth.getSession();

  const { data: leagues } = await supabase
    .from("leagues").select("*").eq("sport", "football")
    .neq("slug", "champions-league").order("name");

  const { data: popular } = await supabase
    .from("forums")
    .select("id, post_count, member_count, team:teams(name, short_name, color, slug, league:leagues(name, flag_emoji, slug))")
    .order("member_count", { ascending: false }).limit(6);

  let subscriptions: unknown[] = [];
  if (session?.user) {
    const { data } = await supabase
      .from("subscriptions")
      .select("id, forum:forums(id, team:teams(name, short_name, color, slug, league:leagues(name, flag_emoji, slug)))")
      .eq("user_id", session.user.id);
    subscriptions = data || [];
  }

  const popularForumIds = (popular || []).map(f => (f as Record<string,unknown>).id as string);
  const subForumIds = subscriptions.map(s => {
    const forum = (s as Record<string,unknown>).forum as Record<string,unknown>;
    return forum?.id as string;
  }).filter(Boolean);
  const allForumIds = Array.from(new Set([...popularForumIds, ...subForumIds]));

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const { data: todayPostsData } = await supabase.from("posts").select("forum_id").eq("title","")
    .in("forum_id", allForumIds.length ? allForumIds : ["__none__"])
    .gte("created_at", todayStart.toISOString());
  const todayCounts: Record<string,number> = {};
  for (const p of todayPostsData ?? []) { todayCounts[p.forum_id] = (todayCounts[p.forum_id] ?? 0) + 1; }

  return (
    <div className="w-full px-0 sm:px-4 py-6">

      {/* ── HERO ──────────────────────────────────────────── */}
      <div
        className="relative mb-6 rounded-2xl overflow-hidden border border-mp-border"
        style={{
          background: "radial-gradient(ellipse 160% 80% at 50% -20%, #1c0810 0%, #0d0a14 40%, #080b14 75%)",
          boxShadow: "inset 0 -2px 0 0 rgba(232,48,74,0.3), 0 4px 60px rgba(232,48,74,0.05)",
        }}
      >
        {/* Pitch SVG lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" viewBox="0 0 900 320" preserveAspectRatio="xMidYMid slice">
          <line x1="450" y1="0" x2="450" y2="320" stroke="white" strokeWidth="1"/>
          <circle cx="450" cy="160" r="90" stroke="white" strokeWidth="1" fill="none"/>
          <circle cx="450" cy="160" r="4" stroke="white" strokeWidth="1.5" fill="none"/>
          <rect x="0" y="90" width="130" height="140" stroke="white" strokeWidth="1" fill="none"/>
          <rect x="770" y="90" width="130" height="140" stroke="white" strokeWidth="1" fill="none"/>
          <rect x="0" y="118" width="55" height="84" stroke="white" strokeWidth="1" fill="none"/>
          <rect x="845" y="118" width="55" height="84" stroke="white" strokeWidth="1" fill="none"/>
        </svg>

        {/* Diagonal slash accent */}
        <svg className="absolute bottom-0 right-0 w-1/2 h-full pointer-events-none" viewBox="0 0 400 320" preserveAspectRatio="none">
          <polygon points="400,0 400,320 0,320" fill="#e8304a" opacity="0.05"/>
        </svg>
        <svg className="absolute top-0 left-0 w-40 h-full pointer-events-none" viewBox="0 0 160 320" preserveAspectRatio="none">
          <polygon points="0,0 160,0 0,320" fill="#e8304a" opacity="0.03"/>
        </svg>

        {/* Glow blobs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-mp-red/[0.07] blur-3xl animate-pulse-slow pointer-events-none"/>
        <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-mp-blue/[0.05] blur-3xl pointer-events-none"/>

        {/* Content */}
        <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-12">

          {!session && (
            <p className="text-[9px] font-bold tracking-[0.25em] text-mp-red uppercase mb-3">
              Sveriges Sportforum
            </p>
          )}
          {session && (
            <p className="text-[9px] font-bold tracking-[0.25em] text-mp-t2 uppercase mb-3">
              Välkommen
            </p>
          )}

          {/* Main headline */}
          <div className="animate-fade-in">
            <h1 className="font-display text-6xl sm:text-8xl tracking-wider leading-none">
              MATCH<span className="text-mp-red">PULS</span>
            </h1>
            <p className="font-display text-2xl sm:text-3xl tracking-wide leading-none text-mp-t1 mt-1">
              DÄR PULSEN <span className="text-mp-red">SLÅR</span>
            </p>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-5 sm:gap-8 mt-6">
            <div>
              <div className="font-display text-2xl sm:text-3xl text-mp-red leading-none">5</div>
              <div className="text-[8px] tracking-[0.15em] text-mp-t2 uppercase mt-0.5">Ligor</div>
            </div>
            <div className="w-px h-8 bg-mp-border flex-shrink-0"/>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-mp-green animate-pulse-slow flex-shrink-0"/>
              <div>
                <div className="font-display text-xl sm:text-2xl text-mp-green leading-none">LIVE</div>
                <div className="text-[8px] tracking-[0.15em] text-mp-t2 uppercase mt-0.5">Livetabeller</div>
              </div>
            </div>
            <div className="w-px h-8 bg-mp-border flex-shrink-0"/>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-mp-blue animate-pulse-slow flex-shrink-0"/>
              <div>
                <div className="font-display text-xl sm:text-2xl text-mp-blue leading-none">LIVE</div>
                <div className="text-[8px] tracking-[0.15em] text-mp-t2 uppercase mt-0.5">Livechatt</div>
              </div>
            </div>
          </div>

          {/* Lower section — guest vs logged-in */}
          <div className="mt-6 pt-5 border-t border-mp-border/40">
            {!session ? (
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4">
                <div className="flex gap-2">
                  <Link href="/auth/register" className="btn-primary px-5 py-2 text-xs sm:text-sm sm:px-6 sm:py-2.5 text-center font-bold">
                    Skapa konto
                  </Link>
                  <Link href="/auth/login" className="btn-ghost px-5 py-2 text-xs sm:text-sm sm:px-6 sm:py-2.5 text-center">
                    Logga in
                  </Link>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-mp-t2">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-mp-green"/>Live matchforum</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-mp-blue"/>Röstchatt</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-mp-amber"/>Prenumerera på lag</span>
                </div>
              </div>
            ) : subscriptions.length > 0 ? (
              <div>
                <p className="text-[9px] font-bold tracking-[0.2em] text-mp-t2 uppercase mb-3">Dina lag</p>
                <div className="flex gap-2 flex-wrap items-center">
                  {subscriptions.slice(0, 7).map((sub) => {
                    const s = sub as Record<string,unknown>;
                    const forum = s.forum as Record<string,unknown>;
                    const team = forum?.team as Record<string,unknown>;
                    const lg = team?.league as Record<string,unknown>;
                    return (
                      <Link
                        key={s.id as string}
                        href={`/forum/${lg?.slug}/${team?.slug}`}
                        title={team?.name as string}
                        className="hover:scale-110 transition-transform"
                      >
                        <TeamBadge color={team?.color as string} shortName={team?.short_name as string} size="sm" />
                      </Link>
                    );
                  })}
                  {subscriptions.length > 7 && (
                    <Link href="/mina-forum"
                      className="w-8 h-8 rounded-lg bg-mp-s2 border border-mp-border flex items-center justify-center text-[9px] text-mp-t2 hover:border-mp-red hover:text-mp-red transition-colors font-bold">
                      +{subscriptions.length - 7}
                    </Link>
                  )}
                  <Link href="/mina-forum"
                    className="ml-2 text-xs text-mp-red font-semibold hover:underline">
                    Alla forum →
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-mp-t1 mb-2">Prenumerera på dina favoritlag för att se dem här.</p>
                <Link href="/forum/popular" className="text-mp-red text-sm font-bold hover:underline">
                  Utforska populära lag →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MINA FORUM ────────────────────────────────────── */}
      {session && subscriptions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-label flex items-center gap-1.5"><Star size={16} strokeWidth={1.75}/> Mina forum</h2>
            <Link href="/forum/popular" className="text-mp-red text-xs font-semibold hover:underline">+ Utforska fler</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subscriptions.map((sub: unknown) => {
              const s = sub as Record<string, unknown>;
              const forum = s.forum as Record<string, unknown>;
              const forumId = forum?.id as string;
              const team = forum?.team as Record<string, unknown>;
              const lg = team?.league as Record<string, unknown>;
              return (
                <Link key={s.id as string} href={`/forum/${lg?.slug}/${team?.slug}`}
                  className="flex items-center gap-3 bg-mp-s1 border border-mp-border rounded-xl p-4 hover:border-mp-red/40 active:scale-[0.99] transition-all group">
                  <TeamBadge color={team?.color as string} shortName={team?.short_name as string} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{team?.name as string}</div>
                    <div className="text-[10px] text-mp-t2">{lg?.flag_emoji as string} {lg?.name as string}</div>
                    <div className="flex gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-mp-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-mp-green"/>
                        <ForumOnlineCount forumId={forumId}/> online
                      </span>
                      {(todayCounts[forumId] ?? 0) > 0 && (
                        <span className="text-[10px] text-mp-red font-semibold">{todayCounts[forumId]} idag</span>
                      )}
                    </div>
                  </div>
                  <span className="text-mp-t2 group-hover:text-mp-red text-xl transition-colors">›</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── LIGOR ─────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="section-label mb-4 flex items-center gap-1.5"><i className="fa-regular fa-futbol text-sm"/> Fotboll – Ligor</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(leagues || []).map((lg: Record<string, unknown>) => (
            <Link key={lg.id as string} href={`/league/${lg.slug}`}
              className="bg-mp-s1 border border-mp-border rounded-xl p-4 text-center hover:border-mp-red hover:-translate-y-0.5 transition-all group">
              <div className="text-3xl mb-2">{lg.flag_emoji as string}</div>
              <div className="text-xs font-bold">{lg.name as string}</div>
              <div className="text-[10px] text-mp-t2 mt-1">{lg.country as string}</div>
            </Link>
          ))}
          <div className="bg-mp-s1 border border-mp-border rounded-xl p-4 text-center opacity-40">
            <div className="text-3xl mb-2"><i className="fa-solid fa-hockey-puck"/></div>
            <div className="text-xs font-bold">SHL</div>
            <div className="text-[10px] text-mp-t2 mt-1">Snart</div>
          </div>
        </div>
      </section>

      {/* ── POPULÄRA LAG ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-label flex items-center gap-1.5"><Flame size={16} strokeWidth={1.75}/> Populära lag</h2>
          <Link href="/forum/popular" className="text-mp-red text-xs font-semibold hover:underline">Se alla</Link>
        </div>
        <div className="space-y-2">
          {(popular || []).map((f: Record<string, unknown>) => {
            const team = f.team as Record<string, unknown>;
            const lg = team?.league as Record<string, unknown>;
            return (
              <Link key={f.id as string} href={`/league/${lg?.slug}/${team?.slug}`}
                className="flex items-center gap-3 bg-mp-s1 border border-mp-border rounded-xl p-3 hover:border-mp-red/40 transition-all group">
                <TeamBadge color={team?.color as string} shortName={team?.short_name as string} size="md"/>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{team?.name as string}</div>
                  <div className="text-[10px] text-mp-t2">{lg?.flag_emoji as string} {lg?.name as string}</div>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-mp-green font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-mp-green"/>
                    <ForumOnlineCount forumId={f.id as string}/> online
                  </span>
                  {(todayCounts[f.id as string] ?? 0) > 0 && (
                    <span className="text-[10px] text-mp-red font-semibold">{todayCounts[f.id as string]} idag</span>
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
