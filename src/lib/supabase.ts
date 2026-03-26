import { createBrowserClient } from '@supabase/ssr'

// ─── Browser client (används i Client Components) ─────────────────────────────
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Realtime helpers ─────────────────────────────────────────────────────────
export function subscribeToForumPosts(
  supabase: ReturnType<typeof createClient>,
  forumId: string,
  onInsert: (payload: Record<string, unknown>) => void,
  onReady?: () => void
) {
  const seen = new Set<string>()
  const handle = async (postId: string) => {
    if (seen.has(postId)) return
    seen.add(postId)
    const { data } = await supabase
      .from('posts')
      .select('*, author:profiles!author_id(id,username,default_alias,avatar_url,role)')
      .eq('id', postId)
      .single()
    if (data) onInsert(data as Record<string, unknown>)
  }

  return supabase
    .channel(`forum:${forumId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'posts', filter: `forum_id=eq.${forumId}` },
      (payload) => handle((payload.new as Record<string, unknown>).id as string)
    )
    // Broadcast fallback — used by NewPostModal to push posts to all clients instantly
    .on('broadcast', { event: 'new_post' }, (payload) => handle(payload.payload.id as string))
    .subscribe((status) => { if (status === 'SUBSCRIBED') onReady?.() })
}

export function subscribeToOnlinePresence(
  supabase: ReturnType<typeof createClient>,
  forumId: string,
  userId: string,
  username: string,
  onSync: (count: number) => void
) {
  const channel = supabase.channel(`presence:${forumId}`, {
    config: { presence: { key: userId } },
  })
  channel
    .on('presence', { event: 'sync' }, () => {
      onSync(Object.keys(channel.presenceState()).length)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId, username, online_at: new Date().toISOString() })
      }
    })

  return channel
}
