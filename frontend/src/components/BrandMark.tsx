import { Text } from '@cloudflare/kumo'
import { useTheme } from '../theme'

const LOGO_SRC = '/brand/poultrytrack-logo.png'
const ICON_SRC = '/brand/poultrytrack-icon.png'

type BrandMarkProps = {
  variant: 'full' | 'compact'
  /** Show “PoultryTrack” next to the icon. Default true for compact. */
  showLabel?: boolean
  className?: string
}

export function BrandMark({
  variant,
  showLabel = true,
  className,
}: BrandMarkProps) {
  const { isDark } = useTheme()

  if (variant === 'full') {
    return (
      <img
        src={LOGO_SRC}
        alt="PoultryTrack"
        className={['mx-auto h-auto w-full max-w-[320px]', className]
          .filter(Boolean)
          .join(' ')}
      />
    )
  }

  return (
    <div
      className={['inline-flex items-center gap-2.5', className]
        .filter(Boolean)
        .join(' ')}
    >
      <img
        src={ICON_SRC}
        alt=""
        width={32}
        height={32}
        className={[
          'h-8 w-8 shrink-0 object-contain',
          isDark ? 'brightness-0 invert' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      />
      {showLabel ? (
        <Text as="span" variant="heading" size="lg">
          PoultryTrack
        </Text>
      ) : (
        <span className="sr-only">PoultryTrack</span>
      )}
    </div>
  )
}
