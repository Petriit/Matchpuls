'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { avatarColor, avatarInitials } from '@/lib/utils'

interface Props { userId: string; username: string; currentAvatarUrl: string | null }

export function AvatarUpload({ userId, username, currentAvatarUrl }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Max 2 MB'); return }
    if (!file.type.startsWith('image/')) { setError('Endast bilder (jpg, png, webp)'); return }

    setUploading(true); setError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) { setError(uploadError.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithCache = `${publicUrl}?t=${Date.now()}`

    // Update both the profiles table and the auth user metadata
    await Promise.all([
      supabase.from('profiles').update({ avatar_url: urlWithCache }).eq('id', userId),
      supabase.auth.updateUser({ data: { avatar_url: urlWithCache } }),
    ])
    setAvatarUrl(urlWithCache)
    setUploading(false)
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Byt profilbild"
        className="relative w-16 h-16 rounded-xl border-2 border-mp-red overflow-hidden group cursor-pointer disabled:opacity-60"
      >
        {avatarUrl
          ? <img src={avatarUrl} className="w-full h-full object-cover" alt={username} />
          : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white"
              style={{ background: avatarColor(username) }}>
              {avatarInitials(username)}
            </div>
        }
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
          <span className="text-white text-base">{uploading ? '⏳' : '📷'}</span>
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />
      <span className="text-[10px] text-mp-t2">Klicka för att byta bild</span>
      {error && <p className="text-xs text-mp-red">{error}</p>}
    </div>
  )
}
