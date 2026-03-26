'use client'
import { useState } from 'react'

interface Props { forumId: string; initialSubscribed: boolean }

export function SubscribeButton({ forumId, initialSubscribed }: Props) {
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const prev = subscribed
    setSubscribed(!prev) // optimistic
    try {
      const form = new FormData()
      form.append('forumId', forumId)
      await fetch('/api/subscribe', { method: 'POST', body: form })
      // Signal ForumLiveStats + ForumFeed about the change
      window.dispatchEvent(new CustomEvent('forum-subscription-changed', { detail: { subscribed: !prev } }))
    } catch {
      setSubscribed(prev) // revert on error
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
        subscribed
          ? 'bg-mp-red/10 border-mp-red text-mp-red'
          : 'border-mp-border text-mp-t1 hover:border-mp-red hover:text-mp-red'
      } disabled:opacity-50`}
    >
      {subscribed ? '★ Medlem' : '☆ Bli medlem'}
    </button>
  )
}
