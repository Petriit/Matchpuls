import Link from 'next/link'
import { createServerComponentClient } from '@/lib/supabase.server'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { ForumOnlineCount } from '@/components/ui/ForumOnlineCount'
import { Flame } from 'lucide-react'
export const metadata = { title: 'Populära forum' }
export const dynamic = 'force-dynamic'

export default async function PopularPage() {
  const supabase = createServerComponentClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [{ data: forums }, { data: leagues }, { data: todayPosts }] = await Promise.all([
    supabase
      .from('forums')
      .select('id, member_count, team:teams(name, short_name, color, slug, league:leagues(name, flag_emoji, slug))')
      .order('member_count', { ascending: false })
      .limit(200),
    supabase
      .from('leagues')
      .select('id, name, flag_emoji, slug')
      .eq('sport', 'football')
      .neq('slug', 'champions-league')
      .order('name'),
    supabase
      .from('posts')
      .select('forum_id')
      .gte('created_at', todayStart.toISOString())
      .eq('title', ''),
  ])

  const todayCounts: Record<string, number> = {}
  todayPosts?.forEach((p: { forum_id: string }) => {
    todayCounts[p.forum_id] = (todayCounts[p.forum_id] ?? 0) + 1
  })

  return (
    <div className="w-full px-0 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl tracking-wide flex items-center gap-2"><Flame size={28} strokeWidth={1.75}/> POPULÄRA FORUM</h1>
      </div>

      {(leagues ?? []).map((lg: Record<string, unknown>) => {
        const lgForums = (forums ?? [])
          .filter((f: Record<string, unknown>) => {
            const team = f.team as Record<string, unknown>
            const league = team?.league as Record<string, unknown>
            return league?.slug === lg.slug
          })
          .map((f: Record<string, unknown>) => ({ ...f, todayCount: todayCounts[f.id as string] ?? 0 }))
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
            (b.todayCount as number) - (a.todayCount as number) ||
            ((b.member_count as number) ?? 0) - ((a.member_count as number) ?? 0)
          )
          .slice(0, 5)

        if (lgForums.length === 0) return null
        return (
          <section key={lg.slug as string} className="mb-8">
            <h2 className="text-sm font-bold text-mp-t1 mb-3 flex items-center gap-2">
              <span className="text-base">{lg.flag_emoji as string}</span>
              {lg.name as string}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lgForums.map((f: Record<string, unknown>) => {
                const team = f.team as Record<string, unknown>
                const league = team?.league as Record<string, unknown>
                const todayCount = f.todayCount as number
                return (
                  <Link key={f.id as string}
                    href={`/forum/${league?.slug}/${team?.slug}`}
                    className="flex items-center gap-3 bg-mp-s1 border border-mp-border rounded-xl p-3 hover:border-mp-red/40 transition-all group">
                    <TeamBadge color={team?.color as string} shortName={team?.short_name as string} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{team?.name as string}</div>
                      <div className="flex gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-mp-green">
                          <span className="w-1.5 h-1.5 rounded-full bg-mp-green" />
                          <ForumOnlineCount forumId={f.id as string} /> online
                        </span>
                        {todayCount > 0 && (
                          <span className="text-xs text-mp-red font-semibold">{todayCount} inlägg idag</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-mp-blue font-semibold">{(f.member_count as number) ?? 0}</div>
                      <div className="text-[10px] text-mp-t2">medlemmar</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
