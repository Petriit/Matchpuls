import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase.server'
import { BADGE_MAP } from '@/lib/badges'

// Syncs author_badge on ALL existing posts & comments for the current user
// based on their currently selected forum badge per forum.
export async function POST() {
  const supabase = createServerComponentClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Get all the user's selected badges per forum
  const { data: aliases } = await supabase
    .from('user_aliases')
    .select('forum_id, selected_badge')
    .eq('user_id', userId)
    .not('selected_badge', 'is', null)

  if (!aliases || aliases.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  let updatedPosts = 0
  let updatedComments = 0

  for (const alias of aliases) {
    // Look up the emoji from the local BADGE_MAP (not a DB join)
    const badgeDef = alias.selected_badge ? BADGE_MAP[alias.selected_badge] : null
    const emoji = badgeDef?.emoji ?? null
    const forumId = alias.forum_id

    // Update all user's posts in this forum
    await supabase
      .from('posts')
      .update({ author_badge: emoji })
      .eq('author_id', userId)
      .eq('forum_id', forumId)
      .eq('title', '')

    updatedPosts++

    // Get all post IDs in this forum to cover comments
    const { data: postIds } = await supabase
      .from('posts')
      .select('id')
      .eq('forum_id', forumId)

    if (postIds && postIds.length > 0) {
      const ids = postIds.map(p => p.id)
      await supabase
        .from('comments')
        .update({ author_badge: emoji })
        .eq('author_id', userId)
        .in('post_id', ids)

      updatedComments++
    }
  }

  return NextResponse.json({ updated: updatedPosts + updatedComments })
}
