'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Heart, ChevronDown, ChevronUp, CornerDownRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { highlightText, timeAgo, avatarColor, avatarInitials, cn } from '@/lib/utils'
import type { Comment } from '@/types'
import type { Session } from '@supabase/supabase-js'

interface Props {
  comment: Comment
  postId: string
  forumId: string
  session: Session | null
  searchQuery?: string
  depth: number
  canWrite?: boolean
  onTyping?: () => void
}

export function CommentThread({ comment, postId, forumId, session, searchQuery='', depth, canWrite=true, onTyping }: Props) {
  const supabase = createClient()
  const [liked, setLiked]   = useState(comment.user_liked ?? false)
  const [likes, setLikes]   = useState(comment.like_count)
  const [showRep, setShowRep] = useState(false)
  const [replies, setReplies] = useState<Comment[]>(comment.replies ?? [])
  const [loaded, setLoaded]  = useState(!!(comment.replies?.length))
  const [showAll, setShowAll] = useState(false)
  const [repText, setRepText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const contentHL = { __html: highlightText(comment.content, searchQuery) }
  const author   = comment.author
  const dispName = author?.default_alias ?? author?.username ?? 'Okänd'
  const isMod    = author?.role === 'moderator' || author?.role === 'admin'

  const loadReplies = async () => {
    if (loaded) return
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles!author_id(id,username,default_alias,avatar_url,role)')
      .eq('parent_id', comment.id)
      .order('created_at')
    setReplies((data as Comment[]) || [])
    setLoaded(true)
  }

  const handleLike = async () => {
    if (!session) { window.location.href = '/auth/login'; return }
    const next = !liked; setLiked(next); setLikes(c => c + (next ? 1 : -1))
    if (next) await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: session.user.id })
    else await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', session.user.id)
  }

  const handleReply = async () => {
    if (!session || !repText.trim()) return
    setSubmitting(true)
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: postId, parent_id: comment.id, author_id: session.user.id, content: repText.trim() })
      .select('*, author:profiles!author_id(id,username,default_alias,avatar_url,role)')
      .single()
    if (data) { setReplies(prev => [...prev, data as Comment]); setLoaded(true); setShowAll(true) }
    setRepText(''); setShowRep(false); setSubmitting(false)
    fetch('/api/badges/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({forum_id:forumId})})
  }

  const visible = showAll ? replies : replies.slice(0, 1)
  const hidden  = replies.length - 1

  const avatarBg = avatarColor(author?.username ?? 'u')

  return (
    <div className={cn('flex gap-0 mt-2', depth > 0 && 'ml-4')}>

      {/* Thread line + avatar column */}
      <div className="flex flex-col items-center mr-2.5 flex-shrink-0" style={{ width: 20 }}>
        {depth > 0 && (
          <div className="w-3 h-3 border-l-2 border-b-2 border-mp-border rounded-bl-sm flex-shrink-0 mb-1 self-start" />
        )}
        <div className="relative flex-shrink-0">
          {author?.avatar_url
            ? <img src={author.avatar_url} className="w-5 h-5 rounded object-cover" alt={dispName} />
            : <div className="w-5 h-5 rounded flex items-center justify-center text-[6px] font-black text-white"
                style={{ background: avatarBg }}>
                {avatarInitials(author?.username ?? 'u')}
              </div>
          }
        </div>
        {/* Vertical thread line for when there are replies */}
        {(replies.length > 0 || showRep) && (
          <div className="w-px flex-1 mt-1" style={{ background: avatarBg, opacity: 0.3 }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Bubble */}
        <div className={cn(
          'rounded-r-xl rounded-bl-xl px-3 py-2 mb-1.5',
          depth === 0 ? 'bg-mp-s2 border-l-2' : 'bg-mp-s2/60 border-l-2',
        )} style={{ borderLeftColor: avatarBg }}>

          {/* Author row */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <Link href={`/profile/${author?.username ?? ''}`} className="text-xs font-bold hover:text-mp-red transition-colors">{dispName}</Link>
            {(comment.author_badge ?? author?.badge) && (
              <span className="text-xs leading-none">{comment.author_badge ?? author?.badge}</span>
            )}
            {isMod && <span className="text-[8px] bg-mp-amber/20 text-mp-amber px-1 font-bold tracking-wider">MOD</span>}
            <span className="text-[10px] text-mp-t2">· {timeAgo(comment.created_at)}</span>
          </div>

          {/* Body */}
          <p className="text-[13px] text-mp-t1 leading-relaxed" dangerouslySetInnerHTML={contentHL} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-1">
          <button onClick={handleLike}
            className={cn('flex items-center gap-1 text-[11px] transition-colors',
              liked ? 'text-mp-red' : 'text-mp-t2 hover:text-mp-red')}>
            <Heart size={11} fill={liked ? 'currentColor' : 'none'} />
            {likes > 0 && <span className="font-display text-sm leading-none">{likes}</span>}
          </button>

          {canWrite && depth < 3 && (
            <button
              onClick={() => { if (!session) { window.location.href = '/auth/login'; return }; setShowRep(f => !f); loadReplies() }}
              className={cn('flex items-center gap-1 text-[11px] transition-colors',
                showRep ? 'text-mp-t0' : 'text-mp-t2 hover:text-mp-t1')}>
              <CornerDownRight size={11} />
              Svara
            </button>
          )}
        </div>

        {/* Reply box */}
        {showRep && session && (
          <div className="flex gap-2 mt-2 ml-1 animate-fade-in">
            <textarea
              className="mp-input flex-1 resize-none text-sm"
              rows={2}
              placeholder={`Svara på ${dispName}...`}
              value={repText}
              onChange={e => { setRepText(e.target.value); onTyping?.() }}
            />
            <button onClick={handleReply} disabled={submitting || !repText.trim()} className="btn-primary text-xs py-1 px-2.5">Skicka</button>
            <button onClick={() => setShowRep(false)} className="btn-ghost text-xs py-1 px-2">Avbryt</button>
          </div>
        )}

        {/* Nested replies */}
        {loaded && replies.length > 0 && (
          <div className="mt-1">
            {visible.map(r => (
              <CommentThread key={r.id} comment={r} postId={postId} forumId={forumId} session={session}
                searchQuery={searchQuery} depth={depth + 1} canWrite={canWrite} onTyping={onTyping} />
            ))}
            {!showAll && hidden > 0 && (
              <button onClick={() => setShowAll(true)}
                className="flex items-center gap-1.5 mt-1.5 ml-1 text-xs text-mp-t2 hover:text-mp-t1 transition-colors">
                <ChevronDown size={12} /> {hidden} svar till
              </button>
            )}
            {showAll && replies.length > 1 && (
              <button onClick={() => setShowAll(false)}
                className="flex items-center gap-1.5 mt-1.5 ml-1 text-xs text-mp-t2 hover:text-mp-t1 transition-colors">
                <ChevronUp size={12} /> Dölj svar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
