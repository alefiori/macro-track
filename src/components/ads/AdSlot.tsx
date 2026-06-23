import { Link } from 'react-router-dom'
import { usePlan } from '@/context/PlanContext'
import { useI18n } from '@/context/I18nContext'

/**
 * A single ad placement. The free/premium product split lives entirely here:
 * premium users see nothing, free users see an ad.
 *
 * The ad network is intentionally pluggable. Today this renders an in-house
 * placeholder banner; to wire a real network (AdSense, an affiliate unit, etc.)
 * replace only the `<AdUnit>` body below — nothing else in the app references
 * the ad provider, it all goes through this component.
 */
interface AdSlotProps {
  /** Where this slot lives, e.g. 'dashboard' | 'foods'. Lets the ad network target. */
  placement: string
  className?: string
}

export function AdSlot({ placement, className }: AdSlotProps) {
  const { isPremium, loading } = usePlan()

  // Render nothing for paying users, and stay empty until the plan is known so
  // premium users never see an ad flash on load.
  if (loading || isPremium) return null

  return (
    <div className={className}>
      <AdUnit placement={placement} />
    </div>
  )
}

/** The actual ad. Swap this implementation when a real network is chosen. */
function AdUnit({ placement }: { placement: string }) {
  const { t } = useI18n()
  return (
    <div
      data-ad-placement={placement}
      className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-6 text-center"
    >
      <span className="font-label-md text-label-md uppercase tracking-wide text-on-surface-variant/70">
        {t('ads.label')}
      </span>
      <Link
        to="/profile"
        className="font-label-md text-label-md text-primary underline-offset-2 hover:underline"
      >
        {t('ads.removeAds')}
      </Link>
    </div>
  )
}
