import { cn } from '@/lib/utils'

function isLight(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55
}

const SIZES: Record<string, string> = {
  xs:  'w-3.5 h-3.5 rounded-sm text-[6px]',
  sm:  'w-6 h-6 rounded text-[8px]',
  md:  'w-10 h-10 rounded-xl text-[10px]',
  lg:  'w-16 h-16 rounded-2xl text-xl',
}

interface Props {
  color: string
  shortName: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function TeamBadge({ color, shortName, size = 'md', className }: Props) {
  return (
    <div
      className={cn('flex items-center justify-center font-black flex-shrink-0', SIZES[size], className)}
      style={{ background: color, color: isLight(color) ? '#0d1120' : '#ffffff' }}
    >
      {shortName?.slice(0, 3)}
    </div>
  )
}
