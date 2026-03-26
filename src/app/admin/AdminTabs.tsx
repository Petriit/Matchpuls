'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate, avatarColor, avatarInitials, cn } from '@/lib/utils'

interface Props {
  users: Record<string, unknown>[]
  posts: Record<string, unknown>[]
  adminLog: Record<string, unknown>[]
  bans: Record<string, unknown>[]
  currentRole: string
  currentUserId: string
}

const TABS = ['Användare', 'Inlägg', 'Mod-logg', 'Spärrade']

export function AdminTabs({ users, posts, adminLog, bans, currentRole, currentUserId }: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState(0)
  const [localUsers, setLocalUsers] = useState(users)
  const [search, setSearch] = useState('')
  const isAdmin = currentRole === 'admin'

  const setRole = async (userId: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    await supabase.from('admin_actions').insert({
      admin_id: currentUserId, action: 'set_role', target_id: userId, target_type: 'user', reason: `Set role to ${role}`,
    })
    setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Ta bort inlägget?')) return
    await supabase.from('posts').delete().eq('id', postId)
    await supabase.from('admin_actions').insert({ admin_id: currentUserId, action: 'delete_post', target_id: postId, target_type: 'post' })
    window.location.reload()
  }

  const pinPost = async (postId: string, pinned: boolean) => {
    await supabase.from('posts').update({ is_pinned: !pinned }).eq('id', postId)
    await supabase.from('admin_actions').insert({ admin_id: currentUserId, action: pinned ? 'unpin_post' : 'pin_post', target_id: postId, target_type: 'post' })
    window.location.reload()
  }

  const banUser = async (userId: string) => {
    const reason = prompt('Anledning till spärr:')
    if (!reason?.trim()) return
    await supabase.from('user_bans').insert({ user_id: userId, banned_by: currentUserId, reason })
    await supabase.from('admin_actions').insert({ admin_id: currentUserId, action: 'ban_user', target_id: userId, target_type: 'user', reason })
    alert('Användaren har spärrats.')
  }

  const unban = async (banId: string, userId: string) => {
    await supabase.from('user_bans').delete().eq('id', banId)
    await supabase.from('admin_actions').insert({ admin_id: currentUserId, action: 'unban_user', target_id: userId, target_type: 'user' })
    window.location.reload()
  }

  const filtered = localUsers.filter(u => !search || (u.username as string)?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex bg-mp-s2 border border-mp-border rounded-xl p-1 mb-4 w-fit gap-1">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              activeTab === i ? 'bg-mp-s1 text-mp-t0' : 'text-mp-t2 hover:text-mp-t1')}>
            {tab}
          </button>
        ))}
      </div>

      {/* Users */}
      {activeTab === 0 && (
        <div>
          <input className="mp-input mb-4 max-w-sm" placeholder="Sök användare..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="bg-mp-s1 border border-mp-border rounded-xl overflow-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="border-b border-mp-border text-mp-t2 text-[10px] uppercase tracking-widest">
                <th className="text-left px-4 py-3">Användare</th>
                <th className="text-left px-4 py-3">Roll</th>
                <th className="text-left px-4 py-3">Inlägg</th>
                <th className="text-left px-4 py-3">Status</th>
                {isAdmin && <th className="text-left px-4 py-3">Åtgärder</th>}
              </tr></thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id as string} className="border-b border-mp-border hover:bg-mp-s2">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-black text-white"
                          style={{ background: avatarColor(u.username as string) }}>
                          {avatarInitials(u.username as string)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs">{u.username as string}</div>
                          <div className="text-[9px] text-mp-t2">{formatDate(u.joined_at as string)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded',
                        u.role === 'admin' ? 'bg-mp-red/20 text-mp-red' :
                        u.role === 'moderator' ? 'bg-mp-amber/20 text-mp-amber' : 'bg-mp-s3 text-mp-t2')}>
                        {u.role as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-mp-t1">{u.post_count as number}</td>
                    <td className="px-4 py-3">
                      <span className={cn('w-2 h-2 rounded-full inline-block', u.is_online ? 'bg-mp-green' : 'bg-mp-t2')} />
                    </td>
                    {isAdmin && u.id !== currentUserId && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {u.role === 'user' && (
                            <button onClick={() => setRole(u.id as string, 'moderator')}
                              className="text-[10px] bg-mp-amber/20 text-mp-amber px-2 py-1 rounded hover:opacity-80">→ Mod</button>
                          )}
                          {u.role === 'moderator' && (
                            <button onClick={() => setRole(u.id as string, 'user')}
                              className="text-[10px] bg-mp-s3 text-mp-t2 px-2 py-1 rounded hover:opacity-80">→ User</button>
                          )}
                          <button onClick={() => banUser(u.id as string)}
                            className="text-[10px] bg-mp-red/15 text-mp-red px-2 py-1 rounded hover:opacity-80">Spärra</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Posts */}
      {activeTab === 1 && (
        <div className="bg-mp-s1 border border-mp-border rounded-xl overflow-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="border-b border-mp-border text-mp-t2 text-[10px] uppercase tracking-widest">
              <th className="text-left px-4 py-3">Inlägg</th>
              <th className="text-left px-4 py-3">Datum</th>
              <th className="text-left px-4 py-3">Åtgärder</th>
            </tr></thead>
            <tbody>
              {posts.map(p => {
                const author = p.author as Record<string, unknown>
                const forum  = p.forum  as Record<string, unknown>
                const team   = forum?.team as Record<string, unknown>
                return (
                  <tr key={p.id as string} className="border-b border-mp-border hover:bg-mp-s2">
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold truncate max-w-xs">{p.title as string}</div>
                      <div className="text-[10px] text-mp-t2">av {author?.username as string} · {team?.name as string}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-mp-t2">{formatDate(p.created_at as string)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => pinPost(p.id as string, p.is_pinned as boolean)}
                          className="text-[10px] bg-mp-amber/15 text-mp-amber px-2 py-1 rounded hover:opacity-80">
                          {p.is_pinned ? '📌 Avfäst' : '📌 Fäst'}
                        </button>
                        <button onClick={() => deletePost(p.id as string)}
                          className="text-[10px] bg-mp-red/15 text-mp-red px-2 py-1 rounded hover:opacity-80">Ta bort</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mod log */}
      {activeTab === 2 && (
        <div className="bg-mp-s1 border border-mp-border rounded-xl overflow-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead><tr className="border-b border-mp-border text-mp-t2 text-[10px] uppercase tracking-widest">
              <th className="text-left px-4 py-3">Moderator</th>
              <th className="text-left px-4 py-3">Åtgärd</th>
              <th className="text-left px-4 py-3">Anledning</th>
              <th className="text-left px-4 py-3">Datum</th>
            </tr></thead>
            <tbody>
              {adminLog.map(a => {
                const admin = a.admin as Record<string, unknown>
                return (
                  <tr key={a.id as string} className="border-b border-mp-border hover:bg-mp-s2">
                    <td className="px-4 py-3 text-xs font-semibold">{admin?.username as string}</td>
                    <td className="px-4 py-3"><span className="text-[10px] bg-mp-s3 text-mp-t1 px-2 py-0.5 rounded font-mono">{a.action as string}</span></td>
                    <td className="px-4 py-3 text-xs text-mp-t2">{(a.reason as string) ?? '–'}</td>
                    <td className="px-4 py-3 text-xs text-mp-t2">{formatDate(a.created_at as string)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bans */}
      {activeTab === 3 && (
        <div className="bg-mp-s1 border border-mp-border rounded-xl overflow-auto">
          {bans.length === 0
            ? <p className="p-8 text-center text-mp-t2 text-sm">Inga aktiva spärrar</p>
            : (
              <table className="w-full text-sm min-w-[500px]">
                <thead><tr className="border-b border-mp-border text-mp-t2 text-[10px] uppercase tracking-widest">
                  <th className="text-left px-4 py-3">Användare</th>
                  <th className="text-left px-4 py-3">Spärrad av</th>
                  <th className="text-left px-4 py-3">Anledning</th>
                  {isAdmin && <th className="text-left px-4 py-3">Åtgärd</th>}
                </tr></thead>
                <tbody>
                  {bans.map(b => {
                    const bu  = b.banned_user as Record<string, unknown>
                    const mod = b.mod as Record<string, unknown>
                    return (
                      <tr key={b.id as string} className="border-b border-mp-border hover:bg-mp-s2">
                        <td className="px-4 py-3 text-xs font-semibold text-mp-red">{bu?.username as string}</td>
                        <td className="px-4 py-3 text-xs text-mp-t1">{mod?.username as string}</td>
                        <td className="px-4 py-3 text-xs text-mp-t2">{(b.reason as string) ?? '–'}</td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <button onClick={() => unban(b.id as string, b.user_id as string)}
                              className="text-[10px] bg-mp-green/15 text-mp-green px-2 py-1 rounded hover:opacity-80">
                              Häv spärr
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          }
        </div>
      )}
    </div>
  )
}
