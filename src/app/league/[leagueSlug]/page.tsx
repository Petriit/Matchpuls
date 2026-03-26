import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerComponentClient } from '@/lib/supabase.server'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { ForumOnlineCount } from '@/components/ui/ForumOnlineCount'
import type { Metadata } from 'next'

interface Props { params: { leagueSlug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerComponentClient()
  const { data: league } = await supabase.from('leagues').select('name').eq('slug', params.leagueSlug).single()
  return { title: league ? `${league.name} – Lag` : 'Liga' }
}

export const dynamic = 'force-dynamic'

export default async function LeaguePage({ params }: Props) {
  const supabase = createServerComponentClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('slug', params.leagueSlug)
    .single()
  if (!league) notFound()

  const { data: teams } = await supabase
    .from('teams')
    .select('*, forum:forums(id, member_count)')
    .eq('league_id', league.id)
    .order('name')

  const forumIds = (teams || []).map(t => ((t as Record<string,unknown>).forum as Record<string,unknown>)?.id as string).filter(Boolean)
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const { data: todayPostsData } = await supabase.from('posts').select('forum_id').eq('title','').in('forum_id', forumIds.length ? forumIds : ['__none__']).gte('created_at', todayStart.toISOString())
  const todayCounts: Record<string,number> = {}
  for (const p of todayPostsData ?? []) { todayCounts[p.forum_id] = (todayCounts[p.forum_id] ?? 0) + 1 }

  return (
    <div className="w-full px-0 sm:px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{league.flag_emoji}</span>
        <div>
          <h1 className="font-display text-3xl tracking-wide">{league.name}</h1>
          <p className="text-sm text-mp-t1">{league.country}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(teams || []).map((team: Record<string, unknown>) => {
          const forum = team.forum as Record<string, unknown> | null
          const forumId = forum?.id as string
          return (
            <Link
              key={team.id as string}
              href={`/league/${params.leagueSlug}/${team.slug}`}
              className="flex items-center gap-3 bg-mp-s1 border border-mp-border rounded-xl p-4 hover:border-mp-red/40 hover:-translate-y-0.5 active:scale-[0.99] transition-all group"
            >
              <TeamBadge color={team.color as string} shortName={team.short_name as string} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{team.name as string}</div>
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
              <span className="text-mp-t2 group-hover:text-mp-red text-xl transition-colors">›</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
