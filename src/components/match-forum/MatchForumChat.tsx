'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { avatarColor, avatarInitials, timeAgo, cn } from '@/lib/utils'
import { OnlinePlupp } from '@/components/ui/OnlinePlupp'
import type { MatchForum, MatchForumPost } from '@/types'
import type { Session } from '@supabase/supabase-js'
interface Props { matchForum: MatchForum; session: Session | null }
export function MatchForumChat({ matchForum, session }: Props) {
  const supabase = createClient()
  const [posts, setPosts]   = useState<MatchForumPost[]>([])
  const [text, setText]     = useState('')
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const isActive = matchForum.status === 'active'
  const fixture  = matchForum.fixture

  useEffect(() => {
    supabase.from('match_forum_posts').select('*, author:profiles(id, username, default_alias, avatar_url, is_online, role)').eq('match_forum_id', matchForum.id).order('created_at').then(({ data }) => setPosts((data as MatchForumPost[]) || []))
  }, [matchForum.id])

  useEffect(() => {
    const ch = supabase.channel(`mf:${matchForum.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_forum_posts', filter: `match_forum_id=eq.${matchForum.id}` }, async (payload) => {
        const { data } = await supabase.from('match_forum_posts').select('*, author:profiles(id, username, default_alias, avatar_url, is_online, role)').eq('id', payload.new.id).single()
        if (data) setPosts(prev => [...prev, data as MatchForumPost])
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { username: typer } = payload as { username: string }
        if (typer === session?.user?.user_metadata?.username) return
        setTyping(prev => prev.includes(typer) ? prev : [...prev, typer])
        clearTimeout(timers.current[typer])
        timers.current[typer] = setTimeout(() => setTyping(prev => prev.filter(u => u !== typer)), 2500)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [matchForum.id, session])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [posts])

  const broadcastTyping = useCallback(() => {
    const username = session?.user?.user_metadata?.username
    if (!username) return
    supabase.channel(`mf:${matchForum.id}`).send({ type: 'broadcast', event: 'typing', payload: { username } })
  }, [matchForum.id, session])

  const send = async () => {
    if (!session || !text.trim() || !isActive) return
    setSending(true)
    await supabase.from('match_forum_posts').insert({ match_forum_id: matchForum.id, author_id: session.user.id, content: text.trim() })
    setText(''); setSending(false)
  }

  return (
    <div className="flex flex-col bg-mp-s1 border border-mp-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-mp-border bg-mp-s2">
        {isActive ? (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-mp-red"><span className="w-2 h-2 rounded-full bg-mp-red animate-pulse-slow" /> Live matchforum</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest text-mp-t2">Matchforum – avslutat</span>
        )}
        {fixture && (
          <div className="flex items-center gap-2 text-xs ml-auto font-bold">
            {fixture.home_team}
            {fixture.score_home !== null && <span className="font-display text-sm px-2 bg-mp-s1 rounded border border-mp-border">{fixture.score_home} – {fixture.score_away}</span>}
            {fixture.away_team}
            {fixture.status === 'live' && fixture.minute && <span className="text-mp-green text-[10px]">{fixture.minute}'</span>}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto max-h-[360px] px-3 py-3 space-y-2">
        {posts.length === 0 && <div className="text-center py-8 text-mp-t2 text-sm">{isActive ? 'Var först att skriva! 🔥' : 'Inga inlägg.'}</div>}
        {posts.map(post => {
          const author = post.author
          const displayName = author?.default_alias ?? author?.username ?? 'Fan'
          const isMe = author?.id === session?.user?.id
          return (
            <div key={post.id} className={cn('flex gap-2 animate-fade-in', isMe && 'flex-row-reverse')}>
              <div className="relative flex-shrink-0">
                <div className="w-7 h-7 rounded flex items-center justify-center text-[8px] font-black text-white" style={{ background: avatarColor(author?.username ?? 'u') }}>{avatarInitials(author?.username ?? 'u')}</div>
                <OnlinePlupp isOnline={author?.is_online ?? false} size="sm" />
              </div>
              <div className={cn('flex flex-col max-w-[75%]', isMe && 'items-end')}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold">{displayName}</span>
                  {author?.username && author.username !== displayName && <span className="text-[9px] text-mp-t2 bg-mp-s3 px-1 rounded">{author.username}</span>}
                  {(author?.role === 'moderator' || author?.role === 'admin') && <span className="text-[8px] bg-mp-amber/20 text-mp-amber px-1 rounded font-bold">MOD</span>}
                  <span className="text-[9px] text-mp-t2">{timeAgo(post.created_at)}</span>
                </div>
                <div className={cn('px-3 py-2 rounded-xl text-xs leading-relaxed', isMe ? 'bg-mp-red/20 border border-mp-red/30 text-mp-t0 rounded-tr-none' : 'bg-mp-s2 border border-mp-border text-mp-t1 rounded-tl-none')}>{post.content}</div>
              </div>
            </div>
          )
        })}
        {typing.length > 0 && <div className="flex items-center gap-2 text-mp-t2 text-[11px] pl-9"><div className="flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1 h-1 rounded-full bg-mp-t2 animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div>{typing[0]} skriver...</div>}
        <div ref={bottomRef} />
      </div>
      {isActive && session ? (
        <div className="flex gap-2 p-3 border-t border-mp-border">
          <input className="mp-input flex-1 text-xs py-2" placeholder="Skriv i matchforumet..." value={text} onChange={e=>{setText(e.target.value);broadcastTyping()}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} maxLength={280}/>
          <button onClick={send} disabled={sending||!text.trim()} className="btn-primary px-3 py-2 flex-shrink-0"><Send size={14}/></button>
        </div>
      ) : isActive ? (
        <div className="p-3 border-t border-mp-border text-center"><button onClick={()=>window.location.href='/auth/login'} className="btn-primary text-xs py-1.5">Logga in för att delta</button></div>
      ) : (
        <div className="p-3 border-t border-mp-border text-center text-xs text-mp-t2">🔒 Matchforumet är stängt</div>
      )}
    </div>
  )
}
