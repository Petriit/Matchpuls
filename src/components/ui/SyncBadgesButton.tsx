'use client'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props { forumIds: string[] }

export function SyncBadgesButton({ forumIds }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [newCount, setNewCount] = useState(0)

  const sync = async () => {
    if (state === 'loading' || forumIds.length === 0) return
    setState('loading')
    let total = 0
    for (const forum_id of forumIds) {
      const res = await fetch('/api/badges/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forum_id }),
      })
      if (res.ok) {
        const data = await res.json() as { earned: string[] }
        total += data.earned?.length ?? 0
      }
    }
    setNewCount(total)
    setState('done')
  }

  return (
    <button
      onClick={sync}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 text-xs text-mp-t2 hover:text-mp-t1 transition-colors disabled:opacity-50"
    >
      <RefreshCw size={11} className={state === 'loading' ? 'animate-spin' : ''} />
      {state === 'idle' && 'Synka märken'}
      {state === 'loading' && 'Kollar...'}
      {state === 'done' && (newCount > 0 ? `+${newCount} nya märken! Ladda om.` : 'Inga nya märken')}
    </button>
  )
}
