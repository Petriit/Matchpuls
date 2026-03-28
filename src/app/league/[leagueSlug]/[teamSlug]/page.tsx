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

const TAG_COLORS: Record<string, string> = {
  match: 'text-mp-blue', transfer: 'text-mp-amber',
  general: 'text-mp-t2', tactic: 'text-mp-purple', other: 'text-mp-green',
}
const TAG_LABELS: Record<string, string> = {
  match: 'Match', transfer: 'Transfer', general: 'Allmänt', tactic: 'Taktik', other: 'Övrigt',
}

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

  let isAdmin = false, isSubscribed = false
  if (session?.user) {
    const [{ data: profile }, { data: sub }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', session.user.id).single(),
      supabase.from('subscriptions').select('id').eq('user_id', session.user.id).eq('forum_id', forum?.id ?? '').maybeSingle(),
    ])
    isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'
    isSubscribed = !!sub
  }

  const { data: articles } = await supabase
    .from('posts')
    .select('id, title, content, created_at, author:profiles(username, default_alias)')
    .eq('forum_id', forum?.id ?? '').neq('title', '')
    .order('created_at', { ascending: false }).limit(10)

  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, like_count, comment_count, created_at, tag, author:profiles(username, default_alias)')
    .eq('forum_id', forum?.id ?? '').eq('title', '')
    .order('created_at', { ascending: false }).limit(8)

  const { data: nextFixture } = await supabase
    .from('fixtures').select('*').eq('team_id', team.id)
    .in('status', ['scheduled', 'live']).order('kickoff_at').limit(1).maybeSingle()

  const league = team.league as Record<string, unknown>
  const fix = nextFixture as Record<string, unknown> | null

  const kickoff = fix?.kickoff_at
    ? new Date(fix.kickoff_at as string).toLocaleDateString('sv-SE', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="w-full min-h-screen">

      {/* ── HERO ──────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${team.color}22 0%, transparent 55%)` }}>
        {/* Colour stripe left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: team.color }} />

        <div className="px-4 sm:px-6 pt-4 pb-5">

          {/* Back link */}
          <Link href={`/league/${params.leagueSlug}`}
            className="inline-flex items-center gap-1 text-[11px] text-mp-t2 hover:text-mp-t0 mb-4 transition-colors">
            ← {league?.flag_emoji as string} {league?.name as string}
          </Link>

          {/* Team identity + actions */}
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <TeamBadge color={team.color} shortName={team.short_name ?? ''} size="lg" className="shadow-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl sm:text-4xl tracking-wide leading-none truncate">{team.name}</h1>
              <p className="text-[11px] text-mp-t2 mt-0.5">{league?.flag_emoji as string} {league?.name as string}</p>
            </div>
          </div>

          {/* CTA row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/forum/${params.leagueSlug}/${params.teamSlug}`}
              className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4">
              <i className="fa-solid fa-comments" /> Öppna forum
            </Link>
            {session && forum && (
              <SubscribeButton forumId={forum.id} initialSubscribed={isSubscribed} />
            )}
          </div>
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-4 border-b border-mp-border">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Antal medlemmar', value: (forum?.member_count ?? 0).toLocaleString('sv-SE'), color: 'text-mp-blue',  border: 'border-l-mp-blue' },
            { label: 'Antal inlägg',    value: (postCount ?? 0).toLocaleString('sv-SE'),           color: 'text-mp-green', border: 'border-l-mp-green' },
            { label: 'Inlägg idag',     value: (todayCount ?? 0).toLocaleString('sv-SE'),          color: 'text-mp-red',   border: 'border-l-mp-red' },
          ].map(s => (
            <div key={s.label} className={`bg-mp-s1 border border-mp-border border-l-2 ${s.border} rounded-lg px-3 py-2.5`}>
              <div className={`font-display text-2xl leading-none ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-mp-t2 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── NEXT MATCH ────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-3 border-b border-mp-border">
        <div className="text-[9px] font-bold text-mp-t2 uppercase tracking-widest mb-1.5">Nästa match</div>
        {fix ? (
          <div className="flex items-center gap-3">
            {fix.status === 'live' && (
              <span className="flex items-center gap-1 text-[10px] font-black text-mp-red flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-mp-red animate-pulse-slow" /> LIVE
              </span>
            )}
            <span className="text-sm font-bold">
              {fix.home_team as string} <span className="text-mp-t2 font-normal">vs</span> {fix.away_team as string}
            </span>
            <span className="text-xs text-mp-red font-semibold ml-auto flex-shrink-0">{kickoff}</span>
          </div>
        ) : (
          <p className="text-xs text-mp-t2 italic">Inga inplanerade matcher</p>
        )}
      </div>

      {/* ── MAIN + ASIDE ──────────────────────────────── */}
      <div className="flex gap-5 items-start px-4 sm:px-6 py-5">

        {/* Main column */}
        <div className="flex-1 min-w-0">

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
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[10px] font-bold text-mp-t2 uppercase tracking-widest">Senaste i forumet</h2>
                <Link href={`/forum/${params.leagueSlug}/${params.teamSlug}`}
                  className="text-[11px] text-mp-red font-semibold hover:underline">Se alla →</Link>
              </div>
              <div className="space-y-1.5">
                {(posts ?? []).map((p: Record<string, unknown>) => {
                  const author = p.author as Record<string, unknown>
                  const tag = p.tag as string
                  return (
                    <Link key={p.id as string}
                      href={`/forum/${params.leagueSlug}/${params.teamSlug}`}
                      className="flex items-start gap-2.5 p-3 bg-mp-s1 border border-mp-border rounded-lg hover:border-mp-red/30 transition-all group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${TAG_COLORS[tag] ?? TAG_COLORS.general}`}>
                            {TAG_LABELS[tag] ?? tag}
                          </span>
                          <span className="text-[9px] text-mp-t2 ml-auto flex-shrink-0">
                            {(author?.default_alias ?? author?.username) as string}
                          </span>
                        </div>
                        <p className="text-xs text-mp-t1 line-clamp-2 group-hover:text-mp-t0 transition-colors leading-relaxed">
                          {p.content as string}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-[9px] text-mp-t2">
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

        {/* Aside — desktop only */}
        <aside className="w-60 flex-shrink-0 hidden lg:flex flex-col gap-4 sticky top-[68px] self-start">
          <LeagueStandingsWidget leagueSlug={params.leagueSlug} highlightTeam={team.name} />
          <div className="bg-mp-s1 border border-mp-border rounded-xl p-4 text-center">
            <p className="text-xs text-mp-t1 mb-3">Delta i diskussionen</p>
            <Link href={`/forum/${params.leagueSlug}/${params.teamSlug}`} className="btn-primary w-full block text-center text-sm">
              Öppna forumet
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
