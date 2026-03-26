'use client'
import { useState, useCallback, useEffect } from 'react'
import { Heart, MessageCircle, ChevronDown, ChevronUp, Lock, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { highlightText, timeAgo, avatarColor, avatarInitials, TAG_LABELS, cn } from '@/lib/utils'
import { CommentThread } from './CommentThread'
import { EmojiReactions } from '@/components/reactions/EmojiReactions'
import type { Post, Comment } from '@/types'
import type { Session } from '@supabase/supabase-js'

interface Props { post: Post; session: Session|null; userAlias:string|null; forumId:string; searchQuery?:string; isNew?:boolean; matchForumActive?:boolean; onTyping?:()=>void }

const TAG_ACCENT: Record<string, string> = {
  match:    'text-mp-blue',
  transfer: 'text-mp-amber',
  general:  'text-mp-t2',
  tactic:   'text-mp-purple',
  other:    'text-mp-green',
}

export function PostCard({ post, session, userAlias, forumId, searchQuery='', isNew, matchForumActive, onTyping }: Props) {
  const supabase = createClient()
  const [liked, setLiked]   = useState(post.user_liked??false)
  const [likes, setLikes]   = useState(post.like_count)
  const [expanded, setExpanded] = useState(false)
  const [showRep, setShowRep] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [repText, setRepText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editContent, setEditContent] = useState(post.content)
  const [editedTitle, setEditedTitle] = useState(post.title)
  const [editedContent, setEditedContent] = useState(post.content)

  const titleHL = { __html: highlightText(editedTitle, searchQuery) }
  const bodyHL  = { __html: highlightText(editedContent, searchQuery) }
  const isOwn = session?.user?.id === post.author_id
  // Only apply the current user's forum alias to their own posts
  const dispName = isOwn && userAlias
    ? userAlias
    : (post.author?.default_alias ?? post.author?.username ?? 'Okänd')
  const isMod = post.author?.role==='moderator'||post.author?.role==='admin'
  const isHot = post.like_count > 50

  const load = useCallback(async() => {
    if (loaded) return
    const { data } = await supabase.from('comments').select('*, author:profiles!author_id(id,username,default_alias,avatar_url,role)').eq('post_id',post.id).order('created_at')
    const all = (data as Comment[])||[]
    const replyMap: Record<string, Comment[]> = {}
    for (const c of all) { if (c.parent_id) { replyMap[c.parent_id] = [...(replyMap[c.parent_id]||[]), c] } }
    const topLevel = all.filter(c => !c.parent_id).map(c => ({ ...c, replies: replyMap[c.id]||[] }))
    setComments(topLevel); setLoaded(true)
  }, [post.id, loaded])

  // Auto-load comments if post already has some
  useEffect(() => { if (post.comment_count > 0) load() }, [])

  const handleLike = async() => {
    if (!session){window.location.href='/auth/login';return}
    const next=!liked; setLiked(next); setLikes(c=>c+(next?1:-1))
    if(next) await supabase.from('post_likes').insert({post_id:post.id,user_id:session.user.id})
    else await supabase.from('post_likes').delete().eq('post_id',post.id).eq('user_id',session.user.id)
  }

  const handleSaveEdit = async() => {
    if(!editTitle.trim()&&!editContent.trim())return
    await supabase.from('posts').update({title:editTitle.trim(),content:editContent.trim()}).eq('id',post.id)
    setEditedTitle(editTitle.trim()); setEditedContent(editContent.trim()); setEditing(false)
  }

  const handleReply = async() => {
    if(!session||!repText.trim())return; setSubmitting(true)
    const{data}=await supabase.from('comments').insert({post_id:post.id,author_id:session.user.id,content:repText.trim(),parent_id:null}).select('*, author:profiles!author_id(id,username,default_alias,avatar_url,is_online,role,badge)').single()
    if(data){setComments(prev=>[...prev,data as Comment]);setLoaded(true);setShowAll(true)}
    setRepText('');setShowRep(false);setSubmitting(false)
    fetch('/api/badges/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({forum_id:forumId})})
  }

  const visible=showAll?comments:comments.slice(0,1)
  const hidden=comments.length-1

  return (
    <article className={cn(
      'relative bg-mp-s1 border border-mp-border rounded-xl transition-all duration-200 p-4 group',
      isNew && 'animate-fade-in'
    )}>

      {/* Hot / pinned badge — top right corner */}
      {(post.is_pinned || isHot) && (
        <span className="absolute top-3 right-3 text-xs font-display tracking-wider text-mp-amber">
          {post.is_pinned ? '📌 FÄST' : '🔥 HETT'}
        </span>
      )}

      {/* Author row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-shrink-0">
          {post.author?.avatar_url
            ? <img src={post.author.avatar_url} className="w-7 h-7 rounded object-cover" alt={post.author.username}/>
            : <div className="w-7 h-7 rounded flex items-center justify-center text-[8px] font-black text-white"
                style={{background:avatarColor(post.author?.username??'u')}}>
                {avatarInitials(post.author?.username??'u')}
              </div>
          }
        </div>
        <Link href={`/profile/${post.author?.username ?? ''}`} className="text-sm font-bold tracking-tight hover:text-mp-red transition-colors">
          {dispName}
        </Link>
        {(post.author_badge ?? post.author?.badge) && (
          <span className="text-base leading-none" title="Forum-märke">{post.author_badge ?? post.author?.badge}</span>
        )}
        {isMod && (
          <span className="text-[9px] bg-mp-amber/15 text-mp-amber px-2 py-0.5 font-bold tracking-widest uppercase">MOD</span>
        )}
        <span className="text-[10px] text-mp-t2 ml-1" suppressHydrationWarning>· {timeAgo(post.created_at)}</span>

        {/* Tag — right side of author row */}
        <span className={cn('ml-auto text-[10px] font-bold uppercase tracking-widest', TAG_ACCENT[post.tag] ?? TAG_ACCENT.general)}>
          {TAG_LABELS[post.tag] ?? 'Övrigt'}
        </span>
      </div>

      {/* Post title / body — editable if own post */}
      {editing ? (
        <div className="space-y-2 mb-2">
          {post.title && <input className="mp-input w-full text-sm font-bold" value={editTitle} onChange={e=>setEditTitle(e.target.value)}/>}
          <textarea className="mp-input w-full resize-none text-sm" rows={3} value={editContent} onChange={e=>setEditContent(e.target.value)}/>
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="btn-primary text-xs py-1 px-3 flex items-center gap-1"><Check size={11}/>Spara</button>
            <button onClick={()=>{setEditing(false);setEditTitle(editedTitle);setEditContent(editedContent)}} className="btn-ghost text-xs py-1 px-3 flex items-center gap-1"><X size={11}/>Avbryt</button>
          </div>
        </div>
      ) : (
        <>
          {editedTitle && <h3 className="font-bold text-base leading-snug mb-1.5" dangerouslySetInnerHTML={titleHL}/>}
          <p className={cn('text-mp-t1 leading-relaxed text-[13px]', !expanded && editedContent.length > 280 && 'line-clamp-4')} dangerouslySetInnerHTML={bodyHL}/>
          {editedContent.length > 280 && (
            <button onClick={() => setExpanded(e => !e)} className="show-more mt-1">
              {expanded ? 'Dölj' : 'Se mer'}
            </button>
          )}
        </>
      )}

      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-mp-blue hover:underline mt-2">
          🔗 <span className="truncate max-w-xs">{post.link_url}</span>
        </a>
      )}

      {/* Emoji reactions */}
      <EmojiReactions postId={post.id} session={session} initialReactions={post.reactions??[]}/>

      {/* Action row — scoreboard-style numbers */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-mp-border/50">
        {isOwn && !editing && (
          <button onClick={()=>{setEditing(true);setEditTitle(editedTitle);setEditContent(editedContent)}}
            className="flex items-center gap-1 text-mp-t2 hover:text-mp-t1 transition-colors ml-auto order-last">
            <Pencil size={11}/><span className="text-[11px]">Redigera</span>
          </button>
        )}
        <button onClick={handleLike}
          className={cn(
            'flex items-center gap-1.5 transition-colors group/like',
            liked ? 'text-mp-red' : 'text-mp-t1 hover:text-mp-red'
          )}>
          <Heart size={13} fill={liked?'currentColor':'none'} className="transition-transform group-hover/like:scale-110"/>
          <span className="font-display text-base leading-none tracking-wide">{likes}</span>
        </button>

        <button
          onClick={()=>{if(matchForumActive)return;if(!session){window.location.href='/auth/login';return}setShowRep(f=>!f);if(!loaded)load()}}
          title={matchForumActive?'Låst under match':undefined}
          className={cn(
            'flex items-center gap-1.5 transition-colors',
            showRep ? 'text-mp-t0' : 'text-mp-t1 hover:text-mp-t0',
            matchForumActive && 'opacity-40 cursor-not-allowed'
          )}>
          {matchForumActive
            ? <><Lock size={12}/><span className="text-xs">Låst</span></>
            : <><MessageCircle size={13}/><span className="font-display text-base leading-none">{post.comment_count}</span><span className="text-xs text-mp-t2">svar</span></>
          }
        </button>
      </div>

      {/* Comment thread */}
      {loaded && comments.length > 0 && (
        <div className="mt-3">
          {visible.map(c=><CommentThread key={c.id} comment={c} postId={post.id} forumId={forumId} session={session} searchQuery={searchQuery} depth={0} canWrite={!matchForumActive} onTyping={onTyping}/>)}
          {!showAll&&hidden>0&&(
            <button onClick={()=>{setShowAll(true);if(!loaded)load()}} className="flex items-center gap-1.5 mt-2 text-xs text-mp-t2 hover:text-mp-t1 transition-colors">
              <ChevronDown size={12}/>{hidden} kommentarer till
            </button>
          )}
          {showAll&&comments.length>1&&(
            <button onClick={()=>setShowAll(false)} className="flex items-center gap-1.5 mt-2 text-xs text-mp-t2 hover:text-mp-t1 transition-colors">
              <ChevronUp size={12}/>Dölj kommentarer
            </button>
          )}
        </div>
      )}

      {/* Reply box */}
      {showRep&&session&&!matchForumActive&&(
        <div className="flex gap-2 mt-3 items-start animate-fade-in border-t border-mp-border/50 pt-3">
          <div className="relative flex-shrink-0">
            {session.user.user_metadata?.avatar_url
              ? <img src={session.user.user_metadata.avatar_url as string} className="w-7 h-7 rounded object-cover" alt="du"/>
              : <div className="w-7 h-7 rounded flex items-center justify-center text-[8px] font-black text-white"
                  style={{background:avatarColor(session.user.user_metadata?.username??'u')}}>
                  {avatarInitials(session.user.user_metadata?.username??'du')}
                </div>
            }
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea className="mp-input w-full resize-none text-sm" rows={2}
              placeholder="Skriv en kommentar..." value={repText}
              onChange={e=>{setRepText(e.target.value);onTyping?.()}}
              onKeyDown={e=>{if(e.key==='Enter'&&e.metaKey)handleReply()}}/>
            <div className="flex gap-2">
              <button onClick={handleReply} disabled={submitting||!repText.trim()} className="btn-primary text-xs py-1.5 px-4">Skicka</button>
              <button onClick={()=>setShowRep(false)} className="btn-ghost text-xs py-1.5 px-3">Avbryt</button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
