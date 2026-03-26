'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Props { forumId: string }

export function ForumLiveStats({ forumId }: Props) {
  const [postCount,   setPostCount]   = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [onlineCount, setOnlineCount] = useState(0)
  const [today,       setToday]       = useState(0)

  useEffect(() => {
    const supabase = createClient()

    const fetchCounts = async () => {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const [{ count: totalCount }, { data: forumData }, { count: todayCount }] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true })
          .eq('forum_id', forumId).eq('title', ''),
        supabase.from('forums').select('member_count').eq('id', forumId).single(),
        supabase.from('posts').select('*', { count: 'exact', head: true })
          .eq('forum_id', forumId).eq('title', '').gte('created_at', todayStart.toISOString()),
      ])
      setPostCount(totalCount ?? 0)
      setMemberCount(forumData?.member_count ?? 0)
      setToday(todayCount ?? 0)
    }
    fetchCounts()

    // Optimistic update when user subscribes/unsubscribes on this page
    const onSubChange = (e: Event) => {
      const { subscribed } = (e as CustomEvent<{subscribed: boolean}>).detail
      setMemberCount(c => subscribed ? c + 1 : Math.max(0, c - 1))
    }
    window.addEventListener('forum-subscription-changed', onSubChange)
    const poll = setInterval(fetchCounts, 30_000)

    const postChannel = supabase
      .channel(`stats-posts:${forumId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `forum_id=eq.${forumId}` },
        () => { setPostCount(c => c + 1); setToday(c => c + 1) }
      )
      .subscribe()

    const forumChannel = supabase
      .channel(`stats-forum:${forumId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'forums', filter: `id=eq.${forumId}` },
        (payload) => {
          const rec = payload.new as { member_count: number; post_count: number }
          setMemberCount(rec.member_count ?? 0)
          setPostCount(rec.post_count ?? 0)
        }
      )
      .subscribe()

    // Read-only presence observer — presence config required for sync events to fire
    const presenceChannel = supabase.channel(`presence:${forumId}`, {
      config: { presence: { key: 'stats-observer' } },
    })
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(presenceChannel.presenceState()).length)
      })
      .subscribe()

    return () => {
      window.removeEventListener('forum-subscription-changed', onSubChange)
      clearInterval(poll)
      supabase.removeChannel(postChannel)
      supabase.removeChannel(forumChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [forumId])

  const stats = [
    { n: postCount.toLocaleString('sv-SE'),   l: 'Inlägg totalt', col: 'text-mp-blue'  },
    { n: memberCount.toLocaleString('sv-SE'), l: 'Medlemmar', col: 'text-mp-blue'  },
    { n: onlineCount,                         l: 'Online nu',     col: 'text-mp-green' },
    { n: today,                               l: 'Idag',          col: 'text-mp-red'   },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map(s => (
        <div key={s.l} className="bg-mp-s2 border border-mp-border rounded-lg p-2 text-center">
          <div className={`text-base font-bold ${s.col}`}>{s.n}</div>
          <div className="text-[9px] text-mp-t2 mt-0.5">{s.l}</div>
        </div>
      ))}
    </div>
  )
}
