import synaptLogo from '../assets/synapt logo.png'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  light?: boolean
}

export function Logo({ size = 'md', light = false }: LogoProps) {
  const imgSize =
    size === 'xl'
      ? 'h-44 w-auto'
      : size === 'lg'
        ? 'h-20 w-auto'
        : size === 'md'
          ? 'h-12 w-auto'
          : 'h-9 w-auto'

  return (
    <div className="flex items-center select-none">
      <img
        src={synaptLogo}
        alt="Synapt Essence — Terapia Integrativa"
        className={`${imgSize} shrink-0 object-contain ${light ? 'brightness-0 invert' : ''}`}
      />
    </div>
  )
}
