import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase.server'
import { BADGES } from '@/lib/badges'

export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { forum_id } = await req.json() as { forum_id: string }
  if (!forum_id) return NextResponse.json({ error: 'Missing forum_id' }, { status: 400 })

  const userId = session.user.id

  // Try RPC first (exists after 002_badges.sql is run); fall back to direct queries
  const { data: rpcData } = await supabase.rpc('get_forum_badge_progress', {
    p_user_id: userId,
    p_forum_id: forum_id,
  })

  let progress: Record<string, number>

  if (rpcData) {
    progress = rpcData as Record<string, number>
  } else {
    // Fallback: direct queries (slightly less accurate for night_post but functional)
    const [
      { count: postCount },
      { data: postsForLikes },
      { count: tacticCount },
      { count: matchForumCount },
    ] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true })
        .eq('author_id', userId).eq('forum_id', forum_id).eq('title', ''),
      supabase.from('posts').select('like_count')
        .eq('author_id', userId).eq('forum_id', forum_id).eq('title', ''),
      supabase.from('posts').select('*', { count: 'exact', head: true })
        .eq('author_id', userId).eq('forum_id', forum_id).eq('tag', 'tactic'),
      supabase.from('match_forum_posts').select('mfp.id', { count: 'exact', head: true })
        .eq('author_id', userId),
    ])

    // Get post IDs to count comments
    const { data: postIds } = await supabase.from('posts').select('id')
      .eq('forum_id', forum_id).eq('title', '')
    const ids = (postIds ?? []).map(p => p.id)
    const { count: commentCount } = ids.length
      ? await supabase.from('comments').select('*', { count: 'exact', head: true })
          .eq('author_id', userId).in('post_id', ids)
      : { count: 0 }

    const likesReceived = (postsForLikes ?? []).reduce((s, p) => s + (p.like_count ?? 0), 0)

    progress = {
      post_count:     postCount ?? 0,
      comment_count:  commentCount ?? 0,
      likes_received: likesReceived,
      match_forum:    matchForumCount ?? 0,
      tactic_count:   tacticCount ?? 0,
      night_post:     0,
    }
  }

  // Check which badges are already earned
  const { data: earned } = await supabase.from('user_forum_badges')
    .select('badge_id').eq('user_id', userId).eq('forum_id', forum_id)

  // If table doesn't exist yet, earned will be null — skip silently
  if (earned === null) return NextResponse.json({ earned: [] })

  const earnedIds = new Set(earned.map(e => e.badge_id))
  const newlyEarned: string[] = []

  for (const badge of BADGES) {
    if (earnedIds.has(badge.id)) continue
    if ((progress[badge.criteria_type] ?? 0) >= badge.criteria_value) {
      const { error } = await supabase
        .from('user_forum_badges')
        .insert({ user_id: userId, forum_id, badge_id: badge.id })
      if (!error) newlyEarned.push(badge.id)
    }
  }

  return NextResponse.json({ earned: newlyEarned })
}
