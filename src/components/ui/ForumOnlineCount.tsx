'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export function ForumOnlineCount({ forumId }: { forumId: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`presence:${forumId}`, {
      config: { presence: { key: `list-obs` } },
    })
    ch.on('presence', { event: 'sync' }, () => {
      setCount(Object.keys(ch.presenceState()).length)
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [forumId])
  return <>{count}</>
}
