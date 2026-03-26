import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerComponentClient } from '@/lib/supabase.server'
import { LeagueStandingsWidget } from '@/components/stats/LeagueStandingsWidget'
import { TeamArticles } from '@/components/team/TeamArticles'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { SubscribeButton } from '@/components/forum/SubscribeButton'
import type { Metadata } from 'next'

interface Props { params: { leagueSlug: string; teamSlug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerComponentClient()
  const { data: team } = await supabase.from('teams').select('name').eq('slug', params.teamSlug).single()
  return { title: team ? team.name : 'Lag' }
}

export const dynamic = 'force-dynamic'

export default async function TeamPage({ params }: Props) {
  const supabase = createServerComponentClient()

  const { data: { session } } = await supabase.auth.getSession()

  const { data: team } = await supabase
    .from('teams').select('*, league:leagues(*)').eq('slug', params.teamSlug).single()
  if (!team) notFound()

  const { data: forum } = await supabase
    .from('forums').select('id, member_count').eq('team_id', team.id).single()

  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const [{ count: postCount }, { count: todayCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('forum_id', forum?.id ?? '').eq('title', ''),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('forum_id', forum?.id ?? '').eq('title', '').gte('created_at', todayStart.toISOString()),
  ])

  // Check if user is admin/moderator and if subscribed
  let isAdmin = false
  let isSubscribed = false
  if (session?.user) {
    const [{ data: profile }, { data: sub }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', session.user.id).single(),
      supabase.from('subscriptions').select('id').eq('user_id', session.user.id).eq('forum_id', forum?.id ?? '').maybeSingle(),
    ])
    isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'
    isSubscribed = !!sub
  }

  // Articles = posts with a non-empty title (CreateArticleModal sets title, NewPostModal uses title:'')
  const { data: articles } = await supabase
    .from('posts')
    .select('id, title, content, created_at, author:profiles(username, default_alias)')
    .eq('forum_id', forum?.id ?? '')
    .neq('title', '')
    .order('created_at', { ascending: false })
    .limit(10)

  // Regular posts have empty title
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, like_count, comment_count, created_at, tag, author:profiles(username, default_alias)')
    .eq('forum_id', forum?.id ?? '')
    .eq('title', '')
    .order('created_at', { ascending: false })
    .limit(15)

  const { data: nextFixture } = await supabase
    .from('fixtures').select('*').eq('team_id', team.id)
    .in('status', ['scheduled', 'live']).order('kickoff_at').limit(1).maybeSingle()

  const league = team.league as Record<string, unknown>

  const TAG_COLORS: Record<string, string> = {
    match: 'bg-mp-blue/20 text-mp-blue',
    transfer: 'bg-mp-amber/20 text-mp-amber',
    general: 'bg-mp-t2/20 text-mp-t1',
    tactic: 'bg-mp-purple/20 text-mp-purple',
    other: 'bg-mp-green/20 text-mp-green',
  }
  const TAG_LABELS: Record<string, string> = {
    match: '⚽ Match', transfer: '💼 Transfer', general: '💬 Allmänt', tactic: '📊 Taktik', other: '🔗 Övrigt',
  }

  return (
    <div className="w-full flex gap-6 items-start px-0 sm:px-4 py-5">

      {/* ── MAIN COLUMN ─────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Back */}
        <Link href={`/league/${params.leagueSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-mp-t2 hover:text-mp-t0 mb-5 transition-colors">
          ← {league?.flag_emoji as string} {league?.name as string}
        </Link>

        {/* Team hero */}
        <div className="relative overflow-hidden rounded-2xl border border-mp-border mb-5">
          {/* Colour band behind header */}
          <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${team.color} 0%, transparent 60%)` }} />
          <div className="relative p-6">
            <div className="flex items-center gap-5 mb-4">
              <TeamBadge color={team.color} shortName={team.short_name ?? ''} size="lg" className="shadow-lg" />
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-2xl sm:text-4xl tracking-wide leading-none">{team.name}</h1>
                <p className="text-sm text-mp-t1 mt-1">
                  {league?.flag_emoji as string} {league?.name as string}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/forum/${params.leagueSlug}/${params.teamSlug}`}
                className="btn-primary inline-flex items-center gap-2 text-sm">
                Öppna forumet
              </Link>
              {session && forum && (
                <SubscribeButton forumId={forum.id} initialSubscribed={isSubscribed} />
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Medlemmar', value: (forum?.member_count ?? 0).toLocaleString('sv-SE'), color: 'text-mp-blue' },
            { label: 'Inlägg', value: (postCount ?? 0).toLocaleString('sv-SE'), color: 'text-mp-green' },
            { label: 'Idag', value: (todayCount ?? 0).toLocaleString('sv-SE'), color: 'text-mp-red' },
          ].map(s => (
            <div key={s.label} className="bg-mp-s1 border border-mp-border rounded-xl p-4 text-center">
              <div className={`font-display text-3xl ${s.color}`}>{s.value}</div>
              <div className="text-xs text-mp-t2 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Next fixture */}
        {nextFixture && (
          <div className="flex items-center gap-4 p-4 bg-mp-s1 border border-mp-border rounded-xl mb-5">
            <span className="text-2xl">📅</span>
            <div className="flex-1">
              <p className="text-[10px] text-mp-t2 font-bold uppercase tracking-widest mb-0.5">Nästa match</p>
              <p className="font-bold">
                {(nextFixture as Record<string, unknown>).home_team as string} vs {(nextFixture as Record<string, unknown>).away_team as string}
              </p>
              <p className="text-sm text-mp-red font-semibold">
                {new Date((nextFixture as Record<string, unknown>).kickoff_at as string).toLocaleDateString('sv-SE', {
                  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            {(nextFixture as Record<string, unknown>).status === 'live' && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-mp-red flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-mp-red animate-pulse-slow" />LIVE
              </span>
            )}
          </div>
        )}

        {/* Articles */}
        <TeamArticles
          initialArticles={(articles ?? []) as never[]}
          forumId={forum?.id ?? ''}
          session={session}
          isAdmin={isAdmin}
          leagueSlug={params.leagueSlug}
          teamSlug={params.teamSlug}
        />

        {/* Recent forum posts */}
        {(posts ?? []).length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-mp-t2 uppercase tracking-widest">Senaste i forumet</h2>
              <Link href={`/forum/${params.leagueSlug}/${params.teamSlug}`}
                className="text-xs text-mp-red font-semibold hover:underline">
                Se alla →
              </Link>
            </div>
            <div className="space-y-2">
              {(posts ?? []).map((p: Record<string, unknown>) => {
                const author = p.author as Record<string, unknown>
                const tag = p.tag as string
                return (
                  <Link key={p.id as string} href={`/forum/${params.leagueSlug}/${params.teamSlug}`}
                    className="block p-4 bg-mp-s1 border border-mp-border rounded-xl hover:border-mp-red/40 transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${TAG_COLORS[tag] ?? TAG_COLORS.general}`}>
                        {TAG_LABELS[tag] ?? tag}
                      </span>
                      <span className="text-xs text-mp-t2 ml-auto">
                        {(author?.default_alias ?? author?.username) as string}
                      </span>
                      <span className="text-xs text-mp-t2">
                        {new Date(p.created_at as string).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-mp-t1 line-clamp-2 group-hover:text-mp-t0 transition-colors">
                      {p.content as string}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-mp-t2">
                      <span>♥ {p.like_count as number}</span>
                      <span>💬 {p.comment_count as number}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── ASIDE – sticky from top ──────────────────── */}
      <aside className="w-64 flex-shrink-0 hidden lg:flex flex-col gap-4 sticky top-4 self-start">
        {/* League standings */}
        <LeagueStandingsWidget
          leagueSlug={params.leagueSlug}
          highlightTeam={team.name}
        />

        {/* Ad slot */}
        <div className="bg-mp-s2 border border-dashed border-mp-border rounded-xl h-40 flex items-center justify-center">
          <span className="text-[10px] font-bold tracking-widest text-mp-t2 uppercase">Annons</span>
        </div>

        {/* Forum CTA */}
        <div className="bg-mp-s1 border border-mp-border rounded-xl p-4 text-center">
          <p className="text-sm text-mp-t1 mb-3">Delta i diskussionen</p>
          <Link href={`/forum/${params.leagueSlug}/${params.teamSlug}`} className="btn-primary w-full block text-center">
            Öppna forumet
          </Link>
        </div>
      </aside>
    </div>
  )
}
