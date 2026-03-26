'use client'
import { useState } from 'react'
import { Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { TeamBadge } from './TeamBadge'
import { BADGES, BADGE_MAP, RARITY_STYLE, type CriteriaType } from '@/lib/badges'

const CRITERIA_LABEL: Record<CriteriaType, string> = {
  post_count:     'inlägg',
  comment_count:  'kommentarer',
  likes_received: 'gillningar',
  match_forum:    'matchforum-inlägg',
  tactic_count:   'taktik-inlägg',
  night_post:     'nattinlägg (00–04)',
}
import { cn } from '@/lib/utils'

export interface AliasRow {
  id: string
  alias: string
  forum_id: string
  selected_badge: string | null  // badge id
  team: { name: string; short_name: string; color: string } | null
}

interface Props {
  aliases: AliasRow[]
  earnedByForum: Record<string, string[]>
  progressByForum: Record<string, Record<string, number>>
  userId: string
}

export function AliasEditor({ aliases, earnedByForum, progressByForum, userId }: Props) {
  const supabase = createClient()

  const [editing, setEditing]       = useState<string | null>(null)
  const [openBadge, setOpenBadge]   = useState<string | null>(null)  // forum_id
  const [aliases_, setAliases]       = useState(aliases)
  const [saving, setSaving]          = useState(false)
  const [newBadge, setNewBadge]     = useState<{ emoji: string; name: string } | null>(null)

  const setAlias = (id: string, val: string) =>
    setAliases(prev => prev.map(a => a.id === id ? { ...a, alias: val } : a))

  const setSelectedBadge = (forumId: string, badgeId: string | null) =>
    setAliases(prev => prev.map(a => a.forum_id === forumId ? { ...a, selected_badge: badgeId } : a))

  const saveAlias = async (a: AliasRow) => {
    const val = a.alias.trim()
    if (!val) return
    setSaving(true)
    await supabase.from('user_aliases').update({ alias: val }).eq('id', a.id)
    setSaving(false)
    setEditing(null)
  }

  const cancelAlias = (a: AliasRow) => {
    setAliases(prev => prev.map(x => x.id === a.id ? { ...x, alias: aliases.find(o => o.id === a.id)?.alias ?? x.alias } : x))
    setEditing(null)
  }

  const equipBadge = async (forumId: string, aliasId: string, badgeId: string | null) => {
    // Save selected badge to user_aliases
    await supabase.from('user_aliases').update({ selected_badge: badgeId }).eq('id', aliasId)
    setSelectedBadge(forumId, badgeId)
    // Backfill all existing posts & comments via server route (bypasses any RLS edge cases)
    fetch('/api/badges/sync-posts', { method: 'POST' })
    if (badgeId) {
      const b = BADGE_MAP[badgeId]
      if (b) { setNewBadge({ emoji: b.emoji, name: b.name }); setTimeout(() => setNewBadge(null), 3000) }
    }
    setOpenBadge(null)
  }

  return (
    <div className="space-y-3">
      {newBadge && (
        <div className="flex items-center gap-2 p-3 bg-mp-amber/10 border border-mp-amber/30 rounded-xl animate-fade-in text-sm font-bold text-mp-amber">
          <span className="text-xl">{newBadge.emoji}</span>
          <span>{newBadge.name} är nu ditt aktiva märke!</span>
        </div>
      )}

      {aliases_.map(a => {
        const earned  = earnedByForum[a.forum_id] ?? []
        const prog    = progressByForum[a.forum_id] ?? {}
        const selBadge = a.selected_badge ? BADGE_MAP[a.selected_badge] : null
        const isEditingAlias  = editing === a.id
        const isBadgeOpen     = openBadge === a.forum_id

        return (
          <div key={a.id} className="bg-mp-s2 border border-mp-border rounded-xl overflow-hidden">
            {/* Alias row */}
            <div className="flex items-center gap-3 p-3">
              {a.team && (
                <TeamBadge color={a.team.color} shortName={a.team.short_name} size="sm" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-mp-t2 font-bold uppercase tracking-widest mb-0.5">{a.team?.name}</div>
                {isEditingAlias ? (
                  <input
                    autoFocus
                    className="mp-input text-sm py-1 w-full"
                    value={a.alias}
                    onChange={e => setAlias(a.id, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveAlias(a); if (e.key === 'Escape') cancelAlias(a) }}
                  />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{a.alias}</span>
                    {selBadge && (
                      <span className="text-base leading-none" title={selBadge.name}>{selBadge.emoji}</span>
                    )}
                  </div>
                )}
              </div>

              {isEditingAlias ? (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => saveAlias(a)} disabled={saving}
                    className="p-1.5 rounded-lg bg-mp-red/15 text-mp-red hover:bg-mp-red/25 transition-colors">
                    <Check size={12}/>
                  </button>
                  <button onClick={() => cancelAlias(a)}
                    className="p-1.5 rounded-lg hover:bg-mp-s3 text-mp-t2 hover:text-mp-t1 transition-colors">
                    <X size={12}/>
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditing(a.id)}
                  className="p-1.5 rounded-lg hover:bg-mp-s3 text-mp-t2 hover:text-mp-t1 transition-colors flex-shrink-0">
                  <Pencil size={12}/>
                </button>
              )}
            </div>

            {/* Badge toggle button */}
            <button
              onClick={() => setOpenBadge(isBadgeOpen ? null : a.forum_id)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 border-t border-mp-border text-xs transition-colors',
                isBadgeOpen ? 'bg-mp-s3 text-mp-t0' : 'text-mp-t2 hover:text-mp-t1 hover:bg-mp-s3'
              )}
            >
              <span className="font-semibold flex items-center gap-1.5">
                {selBadge
                  ? <><span>{selBadge.emoji}</span><span>Aktivt märke: <strong>{selBadge.name}</strong></span></>
                  : <><span className="opacity-50">🏅</span><span>Välj aktivt märke</span></>
                }
                {earned.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-mp-red/15 text-mp-red font-bold text-[9px]">
                    {earned.length}/{BADGES.length}
                  </span>
                )}
              </span>
              {isBadgeOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            </button>

            {/* Badge grid */}
            {isBadgeOpen && (
              <div className="p-3 border-t border-mp-border animate-fade-in">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {BADGES.map(badge => {
                    const isEarned   = earned.includes(badge.id)
                    const isEquipped = a.selected_badge === badge.id
                    const style      = RARITY_STYLE[badge.rarity]
                    const current    = prog[badge.criteria_type] ?? 0
                    const pct        = Math.min(100, Math.round((current / badge.criteria_value) * 100))

                    return (
                      <button
                        key={badge.id}
                        disabled={!isEarned}
                        onClick={() => equipBadge(a.forum_id, a.id, isEquipped ? null : badge.id)}
                        className={cn(
                          'relative flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all',
                          isEarned
                            ? cn('cursor-pointer', isEquipped
                                ? cn(style.border, style.bg, 'ring-2 ring-offset-2 ring-offset-mp-s2', style.border.replace('border-', 'ring-'))
                                : cn(style.border, style.bg, 'hover:opacity-90'))
                            : 'border-mp-border bg-mp-bg opacity-40 cursor-not-allowed'
                        )}
                      >
                        {isEquipped && (
                          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-mp-green flex items-center justify-center">
                            <Check size={8} className="text-mp-bg stroke-[3]"/>
                          </span>
                        )}
                        <span className="text-xl leading-none">{badge.emoji}</span>
                        <span className="text-[9px] font-bold leading-tight">{badge.name}</span>
                        <span className={cn('text-[8px] font-bold uppercase tracking-wider', isEarned ? style.text : 'text-mp-t2')}>
                          {style.label}
                        </span>
                        {!isEarned && (
                          <div className="w-full mt-0.5">
                            <div className="h-0.5 bg-mp-s3 rounded-full overflow-hidden">
                              <div className="h-full bg-mp-t2 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                            </div>
                            <span className="text-[8px] text-mp-t2 mt-0.5 block">
                              {current.toLocaleString('sv-SE')} / {badge.criteria_value.toLocaleString('sv-SE')} {CRITERIA_LABEL[badge.criteria_type]}
                            </span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {earned.length === 0 && (
                  <p className="text-xs text-mp-t2 text-center mt-2">
                    Du har inga upplåsta märken i detta forum än. Börja posta!
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
