import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return escHtml(text)
  const escaped = escHtml(text)
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped.replace(new RegExp(`(${q})`, 'gi'),
    '<mark style="background:rgba(232,48,74,.25);color:#fca5a5;border-radius:3px;padding:0 2px;font-weight:700;">$1</mark>')
}

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: sv })
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateFull(date: string | Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(date))
}

export function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

const AVATAR_COLORS = ['#3b7fff','#9c6fff','#00c471','#e8304a','#ffab00','#06b6d4','#ec4899','#84cc16','#f97316']
export function avatarColor(username: string): string {
  const n = username.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}
export function avatarInitials(username: string): string {
  return username.slice(0, 2).toUpperCase()
}

export const TAG_LABELS: Record<string, string> = {
  match: 'Match', transfer: 'Transfer', general: 'Allmänt', tactic: 'Taktik', other: 'Övrigt',
}
export const TAG_CLASSES: Record<string, string> = {
  match:    'bg-blue-500/15 text-blue-400',
  transfer: 'bg-red-500/15 text-red-400',
  general:  'bg-slate-500/15 text-slate-400',
  tactic:   'bg-amber-500/15 text-amber-400',
  other:    'bg-purple-500/15 text-purple-400',
}
