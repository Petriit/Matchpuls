'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { CreateArticleModal, type Article } from './CreateArticleModal'
import type { Session } from '@supabase/supabase-js'

const PREVIEW_CHARS = 280

interface Props {
  initialArticles: Article[]
  forumId: string
  session: Session | null
  isAdmin: boolean
  leagueSlug: string
  teamSlug: string
}

function ArticleCard({ a, i, leagueSlug, teamSlug, isAdmin, onEdit }: {
  a: Article; i: number; leagueSlug: string; teamSlug: string; isAdmin: boolean; onEdit: (a: Article) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const needsTruncation = a.content.length > PREVIEW_CHARS
  const displayContent = expanded || !needsTruncation ? a.content : a.content.slice(0, PREVIEW_CHARS) + '…'

  return (
    <article className={`bg-mp-s1 border border-mp-border rounded-xl overflow-hidden hover:border-mp-red/40 transition-all ${i === 0 ? 'p-5' : 'p-4'}`}>
      {i === 0 && (
        <span className="text-[10px] font-bold text-mp-red uppercase tracking-widest mb-2 block">
          📌 Senaste
        </span>
      )}
      <h3 className={`font-bold leading-snug mb-2 ${i === 0 ? 'text-xl' : 'text-base'}`}>
        {a.title}
      </h3>
      <p className="text-mp-t1 leading-relaxed text-sm">
        {displayContent}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 mt-2 text-xs font-semibold text-mp-red hover:text-mp-red/80 transition-colors"
        >
          {expanded ? <><ChevronUp size={12}/> Visa mindre</> : <><ChevronDown size={12}/> Visa mer</>}
        </button>
      )}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-mp-border/50 text-xs text-mp-t2">
        <span>{a.author?.default_alias ?? a.author?.username ?? 'Redaktion'}</span>
        <span>·</span>
        <span>{new Date(a.created_at).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <div className="ml-auto flex items-center gap-3">
          {isAdmin && (
            <button onClick={() => onEdit(a)} className="text-mp-t2 hover:text-mp-t0 transition-colors">
              <i className="fa-solid fa-pen text-[11px]" />
            </button>
          )}
          <Link href={`/forum/${leagueSlug}/${teamSlug}`}
            className="text-mp-red font-semibold hover:underline text-xs">
            Diskutera →
          </Link>
        </div>
      </div>
    </article>
  )
}

export function TeamArticles({ initialArticles, forumId, session, isAdmin, leagueSlug, teamSlug }: Props) {
  const [articles, setArticles] = useState<Article[]>(initialArticles)
  const [showModal, setShowModal] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)

  // Client-side fetch on mount — bypasses any stale server-rendered data
  useEffect(() => {
    if (!forumId) return
    const supabase = createClient()
    supabase
      .from('posts')
      .select('id, title, content, created_at, author:profiles!author_id(username, default_alias)')
      .eq('forum_id', forumId)
      .neq('title', '')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data?.length) setArticles(data as unknown as Article[]) })
  }, [forumId])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-mp-t2 uppercase tracking-widest">Artiklar</h2>
        {isAdmin && session && (
          <button onClick={() => setShowModal(true)} className="btn-primary text-xs py-1.5 px-3">
            + Ny artikel
          </button>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-10 bg-mp-s1 border border-dashed border-mp-border rounded-xl">
          <p className="text-mp-t2 text-sm">Inga artiklar publicerade än.</p>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm mt-3">
              Publicera första artikeln
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((a, i) => (
            <ArticleCard key={a.id} a={a} i={i} leagueSlug={leagueSlug} teamSlug={teamSlug}
              isAdmin={isAdmin} onEdit={setEditingArticle} />
          ))}
        </div>
      )}

      {showModal && session && (
        <CreateArticleModal
          forumId={forumId}
          session={session}
          onClose={() => setShowModal(false)}
          onCreated={(a) => { setArticles(prev => [a, ...prev]); setShowModal(false) }}
        />
      )}
      {editingArticle && session && (
        <CreateArticleModal
          forumId={forumId}
          session={session}
          article={editingArticle}
          onClose={() => setEditingArticle(null)}
          onCreated={() => {}}
          onUpdated={(updated) => {
            setArticles(prev => prev.map(a => a.id === updated.id ? updated : a))
            setEditingArticle(null)
          }}
        />
      )}
    </div>
  )
}
