'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export interface Article {
  id: string
  title: string
  content: string
  created_at: string
  author: { username: string; default_alias: string | null } | null
}

interface Props {
  forumId: string
  session: Session
  onCreated: (a: Article) => void
  onUpdated?: (a: Article) => void
  onClose: () => void
  article?: Article  // if set → edit mode
}

export function CreateArticleModal({ forumId, session, onCreated, onUpdated, onClose, article }: Props) {
  const supabase = createClient()
  const isEditing = !!article
  const [title, setTitle] = useState(article?.title ?? '')
  const [content, setContent] = useState(article?.content ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) { setError('Rubrik och text krävs'); return }
    setSubmitting(true); setError('')

    if (isEditing) {
      const { data, error: err } = await supabase
        .from('posts')
        .update({ title: title.trim(), content: content.trim() })
        .eq('id', article.id)
        .select('id, title, content, created_at, author:profiles!author_id(username, default_alias)')
        .single()
      if (err) { setError('Kunde inte spara: ' + err.message); setSubmitting(false); return }
      onUpdated?.(data as unknown as Article)
    } else {
      const { data, error: err } = await supabase
        .from('posts')
        .insert({
          forum_id: forumId,
          author_id: session.user.id,
          title: title.trim(),
          content: content.trim(),
          tag: 'general',
        })
        .select('id, title, content, created_at, author:profiles!author_id(username, default_alias)')
        .single()
      if (err) { setError('Kunde inte publicera: ' + err.message); setSubmitting(false); return }
      onCreated(data as unknown as Article)
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-mp-s1 border border-mp-border rounded-2xl p-5 w-full max-w-2xl my-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl tracking-wide">{isEditing ? 'REDIGERA ARTIKEL' : 'NY ARTIKEL'}</h2>
          <button onClick={onClose} className="text-mp-t2 hover:text-mp-t0"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">Rubrik</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="mp-input w-full" placeholder="Artikelrubrik..." />
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">Innehåll</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              className="mp-input w-full resize-y min-h-[200px]" placeholder="Skriv artikeln här..." />
          </div>
          {error && <p className="text-mp-red text-sm">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Avbryt</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Sparar...' : isEditing ? 'Spara ändringar' : 'Publicera artikel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
