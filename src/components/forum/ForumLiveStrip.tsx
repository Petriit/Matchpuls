'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Props { forumId: string }

export function ForumLiveStrip({ forumId }: Props) {
  const [today, setToday] = useState(0)
  const [online, setOnline] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    const fetchToday = async () => {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const { count } = await supabase
        .from('posts').select('*', { count: 'exact', head: true })
        .eq('forum_id', forumId).gte('created_at', todayStart.toISOString())
      setToday(count ?? 0)
    }
    fetchToday()

    const postChannel = supabase
      .channel(`strip-posts:${forumId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `forum_id=eq.${forumId}` },
        () => setToday(c => c + 1)
      )
      .subscribe()

    // Read-only presence observer — presence config required for sync events to fire
    const presenceChannel = supabase.channel(`presence:${forumId}`, {
      config: { presence: { key: 'strip-observer' } },
    })
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        setOnline(Object.keys(presenceChannel.presenceState()).length)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(postChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [forumId])

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-mp-s1 border-b border-mp-border">
      <div className="flex items-center gap-1.5 bg-mp-red/10 border border-mp-red/25 rounded-full px-3 py-1 text-xs font-bold text-mp-red">
        <span className="w-1.5 h-1.5 rounded-full bg-mp-red animate-pulse-slow" />
        <span>{today} inlägg idag</span>
      </div>
      {online > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-mp-t2">
          <span className="w-1.5 h-1.5 rounded-full bg-mp-green" />
          <span>{online} online</span>
        </div>
      )}
    </div>
  )
}
