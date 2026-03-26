import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerComponentClient } from '@/lib/supabase.server'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { ForumOnlineCount } from '@/components/ui/ForumOnlineCount'
import { Star } from 'lucide-react'
export const metadata = { title: 'Mina forum' }
export const dynamic = 'force-dynamic'
export default async function MinaForumPage() {
  const supabase = createServerComponentClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, forum:forums(id, team:teams(name, short_name, color, slug, league:leagues(name, flag_emoji, slug)))')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  const forumIds = (subs ?? []).map((s: Record<string, unknown>) => (s.forum as Record<string, unknown>)?.id as string).filter(Boolean)
  const todayCounts: Record<string, number> = {}
  if (forumIds.length > 0) {
    const { data: todayPosts } = await supabase.from('posts').select('forum_id').in('forum_id', forumIds).gte('created_at', todayStart.toISOString()).eq('title', '')
    todayPosts?.forEach((p: { forum_id: string }) => {
      todayCounts[p.forum_id] = (todayCounts[p.forum_id] ?? 0) + 1
    })
  }

  return (
    <div className="w-full px-0 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-5"><h1 className="font-display text-2xl tracking-wide flex items-center gap-2"><Star size={24} strokeWidth={1.75}/> MINA FORUM</h1><Link href="/forum/popular" className="text-mp-red text-sm font-semibold hover:underline">+ Utforska fler</Link></div>
      {!subs||subs.length===0?(
        <div className="bg-mp-s1 border border-dashed border-mp-border rounded-2xl p-10 text-center"><div className="text-5xl mb-4">⭐</div><h2 className="font-bold text-base mb-2">Inga prenumerationer än</h2><p className="text-mp-t1 text-sm mb-5">Gå in på ett lag och tryck ☆ Prenumerera.</p><Link href="/forum/popular" className="btn-primary">Utforska populära forum</Link></div>
      ):(
        <div className="space-y-3">
          {(subs as Record<string,unknown>[]).map((sub)=>{
            const f=sub.forum as Record<string,unknown>; const t=f?.team as Record<string,unknown>; const lg=t?.league as Record<string,unknown>
            const todayCount = todayCounts[f?.id as string] ?? 0
            return(<Link key={sub.id as string} href={`/forum/${lg?.slug}/${t?.slug}`} className="flex items-center gap-4 bg-mp-s1 border border-mp-border rounded-2xl p-4 hover:border-mp-red/40 active:scale-[0.99] transition-all group">
              <TeamBadge color={t?.color as string ?? '#e8304a'} shortName={t?.short_name as string ?? ''} size="md" className="w-12 h-12 text-[11px]" />
              <div className="flex-1 min-w-0"><div className="font-bold truncate">{t?.name as string}</div><div className="text-xs text-mp-t2 mt-0.5">{lg?.flag_emoji as string} {lg?.name as string}</div><div className="flex gap-3 mt-1.5"><span className="text-[11px] text-mp-green flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-mp-green"/><ForumOnlineCount forumId={f?.id as string}/> online</span>{todayCount > 0 && <span className="text-[11px] text-mp-red font-semibold">{todayCount} inlägg idag</span>}</div></div>
              <span className="text-mp-t2 group-hover:text-mp-red text-xl transition-colors">›</span>
            </Link>)
          })}
        </div>
      )}
    </div>
  )
}
