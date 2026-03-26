import { cn } from '@/lib/utils'
interface Props { isOnline: boolean; size?: 'sm' | 'md'; className?: string }
export function OnlinePlupp({ isOnline, size = 'md', className }: Props) {
  return (
    <span title={isOnline ? 'Online' : 'Offline'}
      className={cn('rounded-full border-2 border-mp-s1 flex-shrink-0 absolute bottom-0 right-0',
        size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5',
        isOnline ? 'bg-mp-green animate-pulse-slow' : 'bg-mp-t2', className)} />
  )
}
