'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { avatarColor, avatarInitials } from '@/lib/utils'
import { User, Star } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
export function UserMenu({ session, isAdmin }: { session: Session; isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const username = session.user.user_metadata?.username ?? session.user.email?.split('@')[0] ?? 'Du'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (session.user.user_metadata?.avatar_url as string) ?? null
  )

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url) })
  }, [session.user.id])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-xs font-black text-white border-2 border-mp-red flex-shrink-0"
        style={avatarUrl ? undefined : { background: avatarColor(username) }} title={username}>
        {avatarUrl
          ? <img src={avatarUrl} className="w-full h-full object-cover" alt={username} />
          : avatarInitials(username)
        }
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-44 bg-mp-s1 border border-mp-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-3 py-2.5 border-b border-mp-border">
            <p className="text-xs font-bold truncate">{username}</p>
            <p className="text-[10px] text-mp-t2 truncate">{session.user.email}</p>
          </div>
          <div className="py-1">
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-mp-t1 hover:bg-mp-s2 hover:text-mp-t0"><User size={13} strokeWidth={1.75}/> Min sida</Link>
            <Link href="/mina-forum" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-mp-t1 hover:bg-mp-s2 hover:text-mp-t0"><Star size={13} strokeWidth={1.75}/> Mina forum</Link>
            {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-mp-t1 hover:bg-mp-s2 hover:text-mp-t0"><i className="fa-solid fa-shield-halved text-[11px]"/> Admin</Link>}
          </div>
          <div className="border-t border-mp-border py-1">
            <form action="/auth/logout" method="POST">
              <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-mp-red hover:bg-mp-red/10 text-left">Logga ut</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
