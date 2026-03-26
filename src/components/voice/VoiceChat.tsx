'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, PhoneOff, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { avatarColor, avatarInitials, cn } from '@/lib/utils'
import type { Session } from '@supabase/supabase-js'
import { Room, RoomEvent } from 'livekit-client'

interface Props { forumId: string; session: Session | null }
interface RoomMember { id: string; name: string; avatarUrl: string | null }
interface Participant {
  id: string
  name: string
  avatarUrl: string | null
  isMuted: boolean
  isSpeaking: boolean
  isLocal: boolean
}

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        className={`w-${size} h-${size} rounded-lg object-cover`}
        alt={name}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div
      className={`w-${size} h-${size} rounded-lg flex items-center justify-center text-[10px] font-black text-white`}
      style={{ background: avatarColor(name) }}
    >
      {avatarInitials(name)}
    </div>
  )
}

export function VoiceChat({ forumId, session }: Props) {
  const supabase = createClient()
  const roomRef = useRef<Room | null>(null)
  const [joined, setJoined]           = useState(false)
  const [muted, setMuted]             = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([])

  // Disconnect from LiveKit when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      const room = roomRef.current
      if (room) {
        room.disconnect()
        roomRef.current = null
      }
    }
  }, [])

  // Show who is in the room before joining
  useEffect(() => {
    const loadMembers = async () => {
      const { data: vs } = await supabase.from('voice_sessions').select('id').eq('forum_id', forumId).eq('is_active', true).maybeSingle()
      if (!vs) { setRoomMembers([]); return }
      const { data } = await supabase
        .from('voice_participants')
        .select('user_id, profile:profiles(username, default_alias, avatar_url)')
        .eq('session_id', vs.id)
      const members = (data ?? []).map((p: Record<string, unknown>) => {
        const prof = p.profile as Record<string, unknown>
        return {
          id: p.user_id as string,
          name: (prof?.default_alias ?? prof?.username ?? 'Fan') as string,
          avatarUrl: (prof?.avatar_url ?? null) as string | null,
        }
      })
      setRoomMembers(members)
    }
    loadMembers()
    const channel = supabase.channel(`voice-ui:${forumId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_participants' }, loadMembers)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [forumId])

  const syncParticipants = useCallback((room: Room) => {
    const all: Participant[] = []
    const lp = room.localParticipant
    const localMeta = lp.metadata ? JSON.parse(lp.metadata) : {}
    all.push({
      id: lp.identity,
      name: lp.name ?? 'Du',
      avatarUrl: localMeta.avatarUrl ?? session?.user.user_metadata?.avatar_url ?? null,
      isMuted: !lp.isMicrophoneEnabled,
      isSpeaking: lp.isSpeaking,
      isLocal: true,
    })
    room.remoteParticipants.forEach(p => {
      const meta = p.metadata ? JSON.parse(p.metadata) : {}
      all.push({
        id: p.identity,
        name: p.name ?? p.identity,
        avatarUrl: meta.avatarUrl ?? null,
        isMuted: !p.isMicrophoneEnabled,
        isSpeaking: p.isSpeaking,
        isLocal: false,
      })
    })
    setParticipants(all)
  }, [session])

  const joinCall = useCallback(async () => {
    if (!session) { window.location.href = '/auth/login'; return }
    if (!navigator.mediaDevices) { setError('Kräver HTTPS'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/voice/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forumId }),
      })
      const data = await res.json()
      if (!res.ok || !data.token) throw new Error(data.error ?? 'Kunde inte skapa röstrum')

      const room = new Room({ audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true } })
      roomRef.current = room

      room.on(RoomEvent.ParticipantConnected,    () => syncParticipants(room))
      room.on(RoomEvent.ParticipantDisconnected, () => syncParticipants(room))
      room.on(RoomEvent.TrackMuted,              () => syncParticipants(room))
      room.on(RoomEvent.TrackUnmuted,            () => syncParticipants(room))
      room.on(RoomEvent.ActiveSpeakersChanged,   () => syncParticipants(room))
      room.on(RoomEvent.Disconnected, () => {
        setJoined(false); setParticipants([]); roomRef.current = null
      })

      await room.connect(data.serverUrl, data.token)
      await room.localParticipant.setMicrophoneEnabled(true)
      syncParticipants(room)

      // Track in DB
      const { data: vs } = await supabase.from('voice_sessions').select('id').eq('forum_id', forumId).maybeSingle()
      if (vs) await supabase.from('voice_participants').upsert(
        { session_id: vs.id, user_id: session.user.id, is_muted: false },
        { onConflict: 'session_id,user_id' }
      )

      setJoined(true)
    } catch (e) {
      console.error('VoiceChat error:', e)
      const msg = e instanceof Error ? e.message : (typeof e === 'string' ? e : JSON.stringify(e))
      if (msg.includes('permission') || msg.includes('NotAllowed') || msg.includes('getUserMedia')) {
        setError('Ge webbläsaren mikrofontillstånd och försök igen')
      } else {
        setError(msg || 'Okänt fel')
      }
    }
    setLoading(false)
  }, [session, forumId, syncParticipants])

  const leaveCall = useCallback(async () => {
    roomRef.current?.disconnect()
    roomRef.current = null
    const { data: vs } = await supabase.from('voice_sessions').select('id').eq('forum_id', forumId).maybeSingle()
    if (vs && session) await supabase.from('voice_participants').delete().eq('session_id', vs.id).eq('user_id', session.user.id)
    setJoined(false); setParticipants([]); setMuted(false)
  }, [forumId, session])

  const toggleMute = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const next = !muted
    await room.localParticipant.setMicrophoneEnabled(!next)
    setMuted(next)
    syncParticipants(room)
    const { data: vs } = await supabase.from('voice_sessions').select('id').eq('forum_id', forumId).maybeSingle()
    if (vs && session) await supabase.from('voice_participants').update({ is_muted: next }).eq('session_id', vs.id).eq('user_id', session.user.id)
  }, [muted, forumId, session, syncParticipants])

  if (!joined) {
    return (
      <div className="flex items-center gap-3 bg-mp-s1 border border-mp-border rounded-xl px-4 py-3 mb-3">
        <div className="flex-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 mb-1 flex items-center gap-1">
            <i className="fa-solid fa-microphone" /> Röstkanal
          </div>
          <div className="flex items-center gap-2 text-xs">
            {roomMembers.length > 0 ? (
              <>
                <div className="flex">
                  {roomMembers.slice(0, 5).map((m, i) => (
                    <div key={m.id} style={{ marginLeft: i > 0 ? -6 : 0 }}
                      title={m.name}>
                      <Avatar name={m.name} avatarUrl={m.avatarUrl} size={5} />
                    </div>
                  ))}
                </div>
                <span className="text-mp-t1 font-semibold">{roomMembers.length} i rummet</span>
              </>
            ) : (
              <span className="text-mp-t2">Ingen i rummet ännu</span>
            )}
          </div>
        </div>
        {error && <p className="text-[10px] text-mp-red max-w-[160px] text-right">{error}</p>}
        <button onClick={joinCall} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-mp-green text-mp-bg font-bold text-xs hover:opacity-85 disabled:opacity-50 flex-shrink-0">
          <Phone size={13} />{loading ? 'Ansluter...' : 'Gå med'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-mp-s1 border border-mp-border rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-mp-red animate-pulse-slow" />
          <span className="text-xs font-bold">
            <i className="fa-solid fa-microphone mr-1" />Röstkanal – Live
          </span>
        </div>
        <span className="text-[10px] text-mp-t2">{participants.length} deltagare</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
        {participants.map(p => (
          <div key={p.id} className={cn(
            'flex flex-col items-center gap-1 p-2 rounded-lg bg-mp-s2 border transition-all',
            p.isSpeaking ? 'border-mp-green shadow-[0_0_0_2px_rgba(0,230,118,.2)]' : 'border-mp-border',
            p.isLocal && 'border-mp-red/40'
          )}>
            <Avatar name={p.name} avatarUrl={p.avatarUrl} size={8} />
            <span className="text-[9px] font-semibold truncate w-full text-center">
              {p.isLocal ? 'Du' : p.name}
            </span>
            <span className="text-[10px] text-mp-t2">
              {p.isMuted
                ? <i className="fa-solid fa-microphone-slash text-mp-red" />
                : p.isSpeaking
                  ? <i className="fa-solid fa-volume-high text-mp-green" />
                  : <i className="fa-solid fa-microphone" />
              }
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={toggleMute} className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold',
          muted
            ? 'border-mp-border text-mp-t1 hover:border-mp-t0 hover:text-mp-t0'
            : 'border-mp-red/40 bg-mp-red/10 text-mp-red hover:bg-mp-red/20'
        )}>
          {muted
            ? <><Mic size={13}/> Slå på mic</>
            : <><MicOff size={13}/> Dämpa</>
          }
        </button>
        <button onClick={leaveCall}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-mp-red/40 bg-mp-red/10 text-mp-red text-xs font-bold hover:bg-mp-red/20">
          <PhoneOff size={13}/> Lämna
        </button>
      </div>
    </div>
  )
}
