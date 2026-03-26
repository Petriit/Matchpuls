'use client'
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useForumRealtime, useSearch } from '@/hooks'
import { PostCard } from './PostCard'
import { NewPostModal } from './NewPostModal'
import { VoiceChat } from '@/components/voice/VoiceChat'
import { MatchForumChat } from '@/components/match-forum/MatchForumChat'
import { Search, SlidersHorizontal, X, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Post, MatchForum } from '@/types'
import type { Session } from '@supabase/supabase-js'
interface Props { initialPosts:Post[]; forum:{id:string}; session:Session|null; userAlias:string|null; isSubscribed:boolean; initialTodayCount?:number }
const TAGS=[{key:'all',label:'Alla'},{key:'match',label:'Match',icon:'fa-regular fa-futbol'},{key:'transfer',label:'Transfer',icon:'fa-solid fa-arrow-right-arrow-left'},{key:'general',label:'Allmänt',icon:'fa-solid fa-comment-dots'},{key:'tactic',label:'Taktik',icon:'fa-solid fa-chess-board'}]
export function ForumFeed({ initialPosts, forum, session, userAlias, isSubscribed: initialSubscribed, initialTodayCount = 0 }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [todayCount, setTodayCount] = useState(initialTodayCount)
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed)
  const [showModal, setShowModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState('')
  const [matchForum, setMatchForum] = useState<MatchForum|null>(null)
  const [activeMatchTab, setActiveMatchTab] = useState<'forum'|'match'>('forum')
  const { query, setQuery, tagFilter, setTagFilter, results, commentMatchCount } = useSearch(posts, [])
  const { newPosts, typingUsers, broadcastTyping, onlineCount, broadcastNewPost } = useForumRealtime(forum.id, session?.user?.id, session?.user?.user_metadata?.username)

  useEffect(() => {
    const check=async()=>{ const res=await fetch(`/api/match-forum?forumId=${forum.id}`); const d=await res.json(); setMatchForum(d.matchForum??null) }
    check(); const iv=setInterval(check,30000); return ()=>clearInterval(iv)
  },[forum.id])

  useEffect(() => {
    const h = (e: Event) => setIsSubscribed((e as CustomEvent<{subscribed:boolean}>).detail.subscribed)
    window.addEventListener('forum-subscription-changed', h)
    return () => window.removeEventListener('forum-subscription-changed', h)
  }, [])

  // Client-side posts sync — full fetch on mount, then incremental every 5s
  const sessionRef = useRef(session)
  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => {
    const supabase = createClient()

    const formatPosts = (data: Record<string, unknown>[]): Post[] => {
      const sess = sessionRef.current
      return data.map(p => ({
        ...(p as unknown as Post),
        user_liked: sess?.user ? (p.post_likes as {user_id:string}[])?.some(l => l.user_id === sess.user.id) : false,
        reactions: p.post_reactions as {emoji:string;user_id:string}[],
        post_likes: undefined, post_reactions: undefined,
      }))
    }

    // Full sync every 5s — guarantees new posts from any user appear without realtime
    const sync = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, author:profiles!author_id(id, username, default_alias, avatar_url, role), post_likes(user_id), post_reactions(emoji, user_id)')
        .eq('forum_id', forum.id)
        .eq('title', '')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30)
      if (data) {
        const formatted = formatPosts(data as unknown as Record<string, unknown>[])
        setPosts(prev => {
          const dbIds = new Set(formatted.map(p => p.id))
          // Keep any optimistic posts not yet in DB, prepend them
          const optimistic = prev.filter(p => !dbIds.has(p.id))
          return optimistic.length ? [...optimistic, ...formatted] : formatted
        })
      }
    }

    sync()
    const iv = setInterval(sync, 5_000)
    return () => clearInterval(iv)
  }, [forum.id])

  // Increment today count when realtime posts from today arrive
  const countedRealtimeIds = useRef(new Set<string>())
  useEffect(() => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    newPosts.forEach(p => {
      if (!countedRealtimeIds.current.has(p.id) && new Date(p.created_at) >= todayStart) {
        countedRealtimeIds.current.add(p.id)
        setTodayCount(c => c + 1)
      }
    })
  }, [newPosts])

  const matchForumActive=matchForum?.status==='active'
  const allPosts=useMemo(()=>{ const ids=new Set(newPosts.map(p=>p.id)); return [...newPosts,...posts.filter(p=>!ids.has(p.id))] },[posts,newPosts])
  const filtered=useMemo(()=>{
    const base=results.length>0||query||tagFilter!=='all'?results:allPosts
    return base.filter(p=>{ if(fromDate&&new Date(p.created_at)<new Date(fromDate))return false; if(toDate){const to=new Date(toDate);to.setHours(23,59,59);if(new Date(p.created_at)>to)return false}; return true })
  },[results,allPosts,query,tagFilter,fromDate,toDate])

  const handlePostCreated=useCallback((post:Post)=>{
    setPosts(prev=>[post,...prev]); setShowModal(false); setTodayCount(c=>c+1)
    fetch('/api/badges/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({forum_id:forum.id})})
  },[forum.id])

  return (
    <div>
      {/* Live strip — today count + per-forum online count from reliable presence channel */}
      <div className="flex items-center gap-3 py-2 mb-1">
        <div className="flex items-center gap-1.5 bg-mp-red/10 border border-mp-red/25 rounded-full px-3 py-1 text-xs font-bold text-mp-red">
          <span className="w-1.5 h-1.5 rounded-full bg-mp-red animate-pulse-slow" />
          <span>{todayCount} inlägg idag</span>
        </div>
        {onlineCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-mp-t2">
            <span className="w-1.5 h-1.5 rounded-full bg-mp-green" />
            <span>{onlineCount} online</span>
          </div>
        )}
      </div>
      <VoiceChat forumId={forum.id} session={session}/>
      {matchForum&&(
        <div className={cn('rounded-xl border mb-3 overflow-hidden',matchForumActive?'border-mp-red/40 bg-gradient-to-r from-mp-red/10 to-transparent':'border-mp-border bg-mp-s1')}>
          {matchForumActive&&(
            <div className="flex border-b border-mp-red/20">
              <button onClick={()=>setActiveMatchTab('forum')} className={cn('flex-1 py-2.5 text-xs font-bold transition-colors',activeMatchTab==='forum'?'bg-mp-s1 text-mp-t0 border-b-2 border-mp-red':'text-mp-t2 hover:text-mp-t1')}>🔒 Vanliga forumet (låst)</button>
              <button onClick={()=>setActiveMatchTab('match')} className={cn('flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2',activeMatchTab==='match'?'bg-mp-s1 text-mp-red border-b-2 border-mp-red':'text-mp-red/80 hover:text-mp-red')}><span className="w-1.5 h-1.5 rounded-full bg-mp-red animate-pulse-slow"/>Live Matchforum</button>
            </div>
          )}
          {matchForumActive&&activeMatchTab==='match'&&<div className="p-3"><MatchForumChat matchForum={matchForum} session={session}/></div>}
          {matchForum.status==='closed'&&<div className="p-3"><div className="text-xs text-mp-amber mb-2">⏳ Historiken finns kvar ett tag till.</div><MatchForumChat matchForum={matchForum} session={session}/></div>}
        </div>
      )}
      {matchForumActive&&activeMatchTab==='forum'&&(
        <div className="flex items-center gap-3 p-3 bg-mp-red/8 border border-mp-red/20 rounded-xl mb-3">
          <Lock size={16} className="text-mp-red flex-shrink-0"/>
          <div className="text-xs"><span className="font-bold text-mp-red">Forumet är låst under matchen.</span><span className="text-mp-t1 ml-1">Gå till Live Matchforum för att diskutera.</span></div>
          <button onClick={()=>setActiveMatchTab('match')} className="ml-auto text-xs font-bold text-mp-red hover:underline flex-shrink-0">Gå dit →</button>
        </div>
      )}
      <div className="sticky top-0 z-10 bg-mp-bg pt-2 pb-2 space-y-2">
        <div className={cn('flex items-center gap-2 bg-mp-s1 border rounded-xl px-3 py-2 transition-colors',query?'border-mp-red/50':'border-mp-border focus-within:border-mp-red/50')}>
          <Search size={14} className="text-mp-t2 flex-shrink-0"/>
          <input type="text" className="flex-1 bg-transparent outline-none text-mp-t0 text-sm placeholder:text-mp-t2 min-w-0" placeholder="Sök i forumet — ord highlightas direkt i texten..." value={query} onChange={e=>setQuery(e.target.value)}/>
          {query&&<button onClick={()=>setQuery('')} className="text-mp-t2 hover:text-mp-t0"><X size={15}/></button>}
          <button onClick={()=>setShowFilters(f=>!f)} className={cn('flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border flex-shrink-0',showFilters?'border-mp-red text-mp-red bg-mp-red/10':'border-mp-border text-mp-t2 hover:text-mp-t1')}><SlidersHorizontal size={11}/><span className="hidden xs:inline">Filter</span></button>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap px-0.5">
          <div className="flex items-center gap-3 text-[11px] text-mp-t2">
            {query?<><span className="text-mp-amber font-bold">{filtered.length}</span> inlägg{commentMatchCount>0&&<span> · {commentMatchCount} i kommentarer</span>}</>:<span>{allPosts.length} inlägg</span>}
            {onlineCount>0&&<span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-mp-green inline-block"/>{onlineCount} online</span>}
          </div>
          <div className="flex gap-1 flex-wrap">{TAGS.map(t=><button key={t.key} onClick={()=>setTagFilter(t.key)} className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1',tagFilter===t.key?'border-mp-red bg-mp-red/12 text-mp-red':'border-mp-border text-mp-t2 hover:text-mp-t1')}>{t.icon&&<i className={t.icon}/>}{t.label}</button>)}</div>
        </div>
        {showFilters&&(
          <div className="bg-mp-s1 border border-mp-border rounded-xl p-3 animate-fade-in space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 w-8">Från</span>
              <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="mp-input text-xs py-1.5 flex-1"/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 w-8">Till</span>
              <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="mp-input text-xs py-1.5 flex-1"/>
            </div>
            {(fromDate||toDate)&&<button onClick={()=>{setFromDate('');setToDate('')}} className="text-xs text-mp-red font-semibold">Rensa</button>}
          </div>
        )}
      </div>
      {typingUsers.length>0&&!matchForumActive&&(
        <div className="flex items-center gap-2 py-1.5 px-1 text-mp-t2 text-xs animate-fade-in">
          <div className="flex gap-0.5">{[0,1,2].map(i=><span key={i} className="w-1 h-1 rounded-full bg-mp-t2 animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}</div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} skriver…`
              : typingUsers.length === 2
              ? `${typingUsers[0]} och ${typingUsers[1]} skriver…`
              : `${typingUsers[0]} och ${typingUsers.length - 1} andra skriver…`}
          </span>
        </div>
      )}
      {matchForumActive ? (
        <button onClick={()=>setActiveMatchTab('match')} className="flex items-center gap-2 mb-3 mt-1 rounded-lg px-4 py-2 text-sm font-bold bg-mp-s2 border border-mp-border text-mp-t2 cursor-default">
          <Lock size={14}/>Låst under match
        </button>
      ) : !session ? (
        <a href="/auth/login" className="flex items-center gap-2 mb-3 mt-1 btn-primary text-sm">
          <span className="text-base leading-none">+</span> Logga in för att skriva
        </a>
      ) : !isSubscribed ? (
        <div className="flex items-center gap-2 mb-3 mt-1 px-4 py-2 rounded-lg bg-mp-s1 border border-mp-border text-mp-t2 text-sm">
          ☆ Bli medlem på forumet för att skriva inlägg
        </div>
      ) : (
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 mb-3 mt-1 btn-primary text-sm">
          <span className="text-base leading-none">+</span> Nytt inlägg
        </button>
      )}
      {filtered.length===0?<div className="text-center py-16 text-mp-t2"><div className="text-4xl mb-3"><i className="fa-solid fa-magnifying-glass"/></div><p className="font-semibold text-mp-t1 mb-1">Inga inlägg matchar</p><p className="text-sm">Prova ett annat sökord</p></div>:(
        <div className="space-y-2">{filtered.map(post=><PostCard key={post.id} post={post} session={session} userAlias={userAlias} forumId={forum.id} searchQuery={query} isNew={newPosts.some(p=>p.id===post.id)} matchForumActive={matchForumActive} onTyping={broadcastTyping}/>)}</div>
      )}
      <div className="bg-mp-s2 border border-dashed border-mp-border rounded-lg h-12 flex items-center justify-center mt-4"><span className="text-[8px] font-bold tracking-widest text-mp-t2 uppercase">Annons – mitt i forumet</span></div>
      {showModal&&session&&<NewPostModal forumId={forum.id} session={session} userAlias={userAlias} onClose={()=>setShowModal(false)} onCreated={handlePostCreated} onTyping={broadcastTyping} onBroadcast={broadcastNewPost}/>}
    </div>
  )
}
