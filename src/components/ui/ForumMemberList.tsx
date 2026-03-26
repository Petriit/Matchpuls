'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { TeamBadge } from './TeamBadge'

interface ForumEntry {
  name: string
  short_name: string
  color: string
  leagueSlug: string
  teamSlug: string
  flag_emoji: string
  leagueName: string
}

interface Props {
  count: number
  forums: ForumEntry[]
}

export function ForumMemberList({ count, forums }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 hover:text-mp-t0 transition-colors"
      >
        <Users size={11}/> {count} forum
      </button>

      {open && forums.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 z-20 w-56 bg-mp-s1 border border-mp-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-mp-border">
            <span className="text-[9px] font-bold uppercase tracking-widest text-mp-t2">Forummedlem i</span>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {forums.map(f => (
              <Link
                key={f.teamSlug}
                href={`/forum/${f.leagueSlug}/${f.teamSlug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-mp-s2 transition-colors"
              >
                <TeamBadge color={f.color} shortName={f.short_name} size="sm"/>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{f.name}</div>
                  <div className="text-[9px] text-mp-t2">{f.flag_emoji} {f.leagueName}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
