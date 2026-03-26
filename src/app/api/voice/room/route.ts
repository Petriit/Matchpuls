import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, createServiceClient } from '@/lib/supabase.server'
import { AccessToken } from 'livekit-server-sdk'

export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { forumId } = await req.json()
  const roomName = `matchpuls-${forumId.slice(0, 8)}`
  const username = session.user.user_metadata?.username ?? session.user.id
  // Fetch avatar from profiles (user_metadata.avatar_url is not reliable)
  const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single()
  const avatarUrl = profile?.avatar_url ?? null

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: session.user.id,
      name: username,
      metadata: JSON.stringify({ avatarUrl }),
    }
  )
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })
  const token = await at.toJwt()

  // Service client bypasses RLS for voice_sessions write
  const service = createServiceClient()
  await service.from('voice_sessions').upsert(
    { forum_id: forumId, room_name: roomName, is_active: true },
    { onConflict: 'forum_id' }
  )

  return NextResponse.json({ token, serverUrl: process.env.LIVEKIT_URL })
}
