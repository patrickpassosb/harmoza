// HARMOZA — logo (SVG)
export function HarmozaLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="HARMOZA"
    >
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#172554" />
      {/* 4 formas entrelaçadas: azul, teal, laranja, roxo */}
      <path d="M14 42 L26 22 L32 32 L38 22 L50 42 H38 L32 32 L26 42 Z" fill="#0F766E" />
      <circle cx="32" cy="18" r="6" fill="#D97706" />
      <circle cx="20" cy="46" r="5" fill="#6D28D9" />
      <circle cx="44" cy="46" r="5" fill="#F59E0B" />
    </svg>
  )
}

export function HarmozaLogoDark({
  size = 32,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="HARMOZA"
    >
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#0F172A" />
      <path d="M14 42 L26 22 L32 32 L38 22 L50 42 H38 L32 32 L26 42 Z" fill="#2DD4BF" />
      <circle cx="32" cy="18" r="6" fill="#FB923C" />
      <circle cx="20" cy="46" r="5" fill="#A78BFA" />
      <circle cx="44" cy="46" r="5" fill="#FBBF24" />
    </svg>
  )
}

export function HarmozaWordmark({
  dark = false,
  size = 'md',
}: {
  dark?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const font = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl'
  return (
    <span
      className={`font-display font-extrabold tracking-tight ${font} ${dark ? 'text-white' : 'text-harmoza-navy'}`}
    >
      HARMO<span className="text-harmoza-teal">ZA</span>
    </span>
  )
}
