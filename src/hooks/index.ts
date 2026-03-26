'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient, subscribeToForumPosts, subscribeToOnlinePresence } from '@/lib/supabase'
import type { Post, Comment } from '@/types'

export function useForumRealtime(forumId: string, userId?: string, username?: string) {
  const supabase = createClient()
  const [newPosts, setNewPosts] = useState<Post[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const postChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const channelReadyRef = useRef(false)

  useEffect(() => {
    if (!forumId) return
    channelReadyRef.current = false
    const postChannel = subscribeToForumPosts(
      supabase,
      forumId,
      (payload) => { setNewPosts(prev => [payload as unknown as Post, ...prev]) },
      () => { channelReadyRef.current = true }
    )
    postChannelRef.current = postChannel

    let presenceChannel: ReturnType<typeof supabase.channel> | null = null
    if (userId && username) {
      presenceChannel = subscribeToOnlinePresence(supabase, forumId, userId, username,
        (count) => setOnlineCount(count))
    }

    const typingChannel = supabase
      .channel(`typing:${forumId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { username: typer } = payload as { username: string }
        if (typer === username) return
        setTypingUsers(prev => prev.includes(typer) ? prev : [...prev, typer])
        clearTimeout(typingTimers.current[typer])
        typingTimers.current[typer] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== typer))
        }, 2500)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(postChannel)
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel)
        // Mark offline in DB when navigating away from the forum (not just on tab close)
        if (userId) {
          supabase.from('profiles').update({ is_online: false }).eq('id', userId)
        }
      }
      supabase.removeChannel(typingChannel)
    }
  }, [forumId, userId, username])

  const broadcastTyping = useCallback(() => {
    if (!username) return
    supabase.channel(`typing:${forumId}`).send({ type: 'broadcast', event: 'typing', payload: { username } })
  }, [forumId, username])

  const broadcastNewPost = useCallback((postId: string) => {
    if (channelReadyRef.current && postChannelRef.current) {
      postChannelRef.current.send({ type: 'broadcast', event: 'new_post', payload: { id: postId } })
    } else {
      // Channel not ready yet — subscribe a temporary channel to send the broadcast
      const tmp = supabase.channel(`forum:${forumId}`)
      tmp.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          tmp.send({ type: 'broadcast', event: 'new_post', payload: { id: postId } })
          setTimeout(() => supabase.removeChannel(tmp), 3000)
        }
      })
    }
  }, [forumId])

  return { newPosts, onlineCount, typingUsers, broadcastTyping, broadcastNewPost }
}

export function useSearch(posts: Post[], comments: Comment[]) {
  const [query, setQuery]       = useState('')
  const [tagFilter, setTagFilter] = useState('all')

  const results = useMemo(() => posts.filter(post => {
    const matchesTag = tagFilter === 'all' || post.tag === tagFilter
    if (!query.trim()) return matchesTag
    const q = query.toLowerCase()
    const inPost = post.title.toLowerCase().includes(q) || post.content.toLowerCase().includes(q) ||
                   (post.author?.username || '').toLowerCase().includes(q)
    const inComments = comments.filter(c => c.post_id === post.id).some(c => c.content.toLowerCase().includes(q))
    return matchesTag && (inPost || inComments)
  }), [posts, comments, query, tagFilter])

  const commentMatchCount = useMemo(() =>
    query.trim() ? comments.filter(c => c.content.toLowerCase().includes(query.toLowerCase())).length : 0,
    [comments, query])

  return { query, setQuery, tagFilter, setTagFilter, results, commentMatchCount }
}
