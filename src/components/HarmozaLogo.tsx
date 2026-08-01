// HARMOZA — logo mark + wordmark
interface Props {
  size?: number
  showName?: boolean
  light?: boolean
}

export function HarmozaLogo({ size = 36, showName = true, light = false }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="HARMOZA">
        <rect x="6" y="6" width="24" height="24" rx="7" fill="#172554" />
        <rect x="34" y="6" width="24" height="24" rx="7" fill="#0F766E" />
        <rect x="6" y="34" width="24" height="24" rx="7" fill="#D97706" />
        <rect x="34" y="34" width="24" height="24" rx="7" fill="#6D28D9" />
      </svg>
      {showName && (
        <div className="leading-none">
          <span
            className={`font-display text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-[#172554]'}`}
          >
            HARMOZA
          </span>
          <span
            className={`block text-[10px] font-medium ${light ? 'text-white/60' : 'text-[#0F766E]'}`}
          >
            a gestão que se encaixa no seu negócio
          </span>
        </div>
      )}
    </div>
  )
}
