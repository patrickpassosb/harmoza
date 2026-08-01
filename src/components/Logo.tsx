// HARMOZA — logo e wordmark
import { cn } from '@/lib/utils'

export function HarmozaLogo({
  size = 32,
  light = false,
  showName = false,
  className,
}: {
  size?: number
  light?: boolean
  showName?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="6" y="6" width="16" height="16" rx="3" fill="#172554" />
        <rect x="26" y="6" width="16" height="16" rx="3" fill="#0F766E" />
        <rect x="6" y="26" width="16" height="16" rx="3" fill="#D97706" />
        <rect x="26" y="26" width="16" height="16" rx="3" fill="#6D28D9" />
        <circle cx="24" cy="24" r="6" fill="#F8F7F4" />
      </svg>
      {showName && (
        <span
          className={cn(
            'text-lg font-extrabold tracking-tight',
            light ? 'text-white' : 'text-[#172554]',
          )}
        >
          HARMOZA
        </span>
      )}
    </div>
  )
}

export function HarmozaWordmark({
  dark = false,
  size = 'md',
}: {
  dark?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' }
  return (
    <span
      className={cn(
        'font-extrabold tracking-tight',
        sizes[size],
        dark ? 'text-[#172554]' : 'text-white',
      )}
    >
      HARMOZA
    </span>
  )
}
