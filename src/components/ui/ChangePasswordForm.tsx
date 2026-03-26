'use client'
import { useState } from 'react'
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export function ChangePasswordForm() {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPw.length < 6) { setError('Lösenordet måste vara minst 6 tecken'); return }
    if (newPw !== confirmPw) { setError('Lösenorden matchar inte'); return }
    setStatus('loading')
    const { error: err } = await supabase.auth.updateUser({ password: newPw })
    if (err) { setError(err.message); setStatus('error'); return }
    setStatus('success')
    setNewPw('')
    setConfirmPw('')
    setTimeout(() => { setStatus('idle'); setOpen(false) }, 2000)
  }

  return (
    <div className="bg-mp-s1 border border-mp-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-mp-s2 transition-colors text-left"
      >
        <span className="text-xs font-bold text-mp-t1 flex items-center gap-2">
          <i className="fa-solid fa-lock text-mp-t2"/>
          Byta lösenord
        </span>
        {open ? <ChevronUp size={14} className="text-mp-t2"/> : <ChevronDown size={14} className="text-mp-t2"/>}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-1 space-y-3 animate-fade-in border-t border-mp-border">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="mp-input w-full pr-10"
              placeholder="Nytt lösenord (minst 6 tecken)"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mp-t2 hover:text-mp-t1">
              {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          <input
            type={showPw ? 'text' : 'password'}
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            className="mp-input w-full"
            placeholder="Bekräfta nytt lösenord"
            autoComplete="new-password"
          />
          {error && <p className="text-mp-red text-xs">{error}</p>}
          {status === 'success' && <p className="text-mp-green text-xs font-semibold">Lösenord uppdaterat!</p>}
          <button type="submit" disabled={status === 'loading'} className="btn-primary text-sm py-2 px-4">
            {status === 'loading' ? 'Sparar...' : 'Byt lösenord'}
          </button>
        </form>
      )}
    </div>
  )
}
