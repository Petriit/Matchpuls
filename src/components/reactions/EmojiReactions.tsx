'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { REACTION_EMOJIS, type ReactionEmoji, type ReactionCounts } from '@/types'
import { cn } from '@/lib/utils'
import type { Session } from '@supabase/supabase-js'
interface Props { postId: string; session: Session | null; initialReactions?: { emoji: string; user_id: string }[] }
function buildCounts(reactions: { emoji: string; user_id: string }[], userId?: string): ReactionCounts {
  const result: ReactionCounts = {}
  reactions.forEach(r => {
    if (!result[r.emoji]) result[r.emoji] = { count: 0, userReacted: false }
    result[r.emoji].count++
    if (r.user_id === userId) result[r.emoji].userReacted = true
  })
  return result
}
export function EmojiReactions({ postId, session, initialReactions = [] }: Props) {
  const supabase = createClient()
  const [counts, setCounts] = useState<ReactionCounts>(() => buildCounts(initialReactions, session?.user?.id))
  const [showAll, setShowAll] = useState(false)
  const [animating, setAnimating] = useState<string | null>(null)
  useEffect(() => {
    const channel = supabase.channel(`reactions:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions', filter: `post_id=eq.${postId}` },
        async () => {
          const { data } = await supabase.from('post_reactions').select('emoji, user_id').eq('post_id', postId)
          if (data) setCounts(buildCounts(data, session?.user?.id))
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [postId, session?.user?.id])
  const toggle = async (emoji: ReactionEmoji) => {
    if (!session) { window.location.href = '/auth/login'; return }
    const wasReacted = counts[emoji]?.userReacted ?? false
    setCounts(prev => ({ ...prev, [emoji]: { count: (prev[emoji]?.count ?? 0) + (wasReacted ? -1 : 1), userReacted: !wasReacted } }))
    setAnimating(emoji); setTimeout(() => setAnimating(null), 300)
    if (wasReacted) {
      await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', session.user.id).eq('emoji', emoji)
    } else {
      await supabase.from('post_reactions').insert({ post_id: postId, user_id: session.user.id, emoji })
    }
  }
  const active = REACTION_EMOJIS.filter(e => (counts[e]?.count ?? 0) > 0)
  const display = showAll ? REACTION_EMOJIS : active
  return (
    <div className="flex items-center gap-1 flex-wrap mt-2" onMouseEnter={() => setShowAll(true)} onMouseLeave={() => setShowAll(false)}>
      {!showAll && active.length === 0 && (
        <button onMouseEnter={() => setShowAll(true)} className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-mp-border text-mp-t2 text-xs hover:border-mp-t1">+ 😊</button>
      )}
      {display.map(emoji => {
        const d = counts[emoji]; const hasCount = (d?.count ?? 0) > 0; const reacted = d?.userReacted ?? false
        if (!showAll && !hasCount) return null
        return (
          <button key={emoji} onClick={() => toggle(emoji)}
            className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all duration-150',
              reacted ? 'bg-mp-red/15 border-mp-red/40 text-mp-t0' : hasCount ? 'bg-mp-s2 border-mp-border text-mp-t1 hover:border-mp-t1' : 'bg-mp-s2 border-dashed border-mp-border text-mp-t2 hover:border-mp-t1',
              animating === emoji && 'scale-125')}>
            <span className={cn(animating === emoji && 'animate-bounce')}>{emoji}</span>
            {hasCount && <span className="text-[10px] font-bold min-w-[12px]">{d?.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
