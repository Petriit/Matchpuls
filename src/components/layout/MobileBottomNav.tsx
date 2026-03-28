'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Flame, Star, User, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Session } from '@supabase/supabase-js'
interface Props { session: Session | null; subscriptionCount: number }
export function MobileBottomNav({ session, subscriptionCount }: Props) {
  const pathname = usePathname()
  const items = [
    { href: '/',              icon: Home,   label: 'Hem',      active: pathname === '/' },
    { href: '/forum/popular', icon: Flame,  label: 'Lag',      active: pathname === '/forum/popular' },
    { href: '/ligor',         icon: Trophy, label: 'Tabeller', active: pathname.startsWith('/ligor') },
    { href: '/mina-forum',    icon: Star,   label: 'Forum',    active: pathname === '/mina-forum', badge: subscriptionCount > 0 ? subscriptionCount : undefined, authOnly: true },
    { href: session ? '/profile' : '/auth/login', icon: User, label: session ? 'Min sida' : 'Logga in', active: pathname === '/profile' },
  ]
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-mp-s1 border-t border-mp-border flex items-center justify-around" style={{ height: 'calc(54px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {items.filter(item => !item.authOnly || session).map(item => (
        <Link key={item.href} href={item.href} className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative transition-colors', item.active ? 'text-mp-red' : 'text-mp-t2')}>
          <item.icon size={20} strokeWidth={item.active ? 2.5 : 1.5} />
          <span className="text-[9px] font-semibold">{item.label}</span>
          {item.badge && <span className="absolute top-1.5 right-[calc(50%-18px)] bg-mp-red text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{item.badge > 9 ? '9+' : item.badge}</span>}
          {item.active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-mp-red rounded-full" />}
        </Link>
      ))}
    </nav>
  )
}
