import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/context/ProfileContext'
import { usePlan } from '@/context/PlanContext'
import { useI18n } from '@/context/I18nContext'
import { LOCALES, type Locale } from '@/lib/i18n'
import { PREMIUM_PRICE_ANNUAL, PREMIUM_PRICE_MONTHLY } from '@/lib/constants'
import { createCheckoutSession, createPortalSession, type BillingPlan } from '@/lib/billing'
import { Icon } from '@/components/ui/Icon'
import { Spinner } from '@/components/ui/Spinner'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { locale, setLocale, loading: profileLoading } = useProfile()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [savingLang, setSavingLang] = useState(false)
  const [langError, setLangError] = useState<string | null>(null)

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }

  async function handleLanguageChange(code: Locale) {
    setLangError(null)
    setSavingLang(true)
    try {
      await setLocale(code)
    } catch {
      setLangError(t('profile.couldNotSaveLanguage'))
    } finally {
      setSavingLang(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-lg px-container-margin-mobile py-lg md:px-container-margin-desktop md:py-xl">
      <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
        {t('profile.title')}
      </h2>

      <div className="flex flex-col gap-lg rounded-2xl bg-surface-container-lowest p-lg shadow-card">
        <div className="flex items-center gap-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Icon name="person" className="text-3xl" />
          </div>
          <div className="min-w-0">
            <p className="font-label-md text-label-md text-on-surface-variant">{t('profile.signedInAs')}</p>
            <p className="truncate font-headline-md text-headline-md text-on-surface">{user?.email}</p>
          </div>
        </div>

        <hr className="border-surface-container-highest" />

        {/* App + food database language (single preference) */}
        <div className="flex flex-col gap-sm">
          <div className="flex items-center gap-2">
            <Icon name="translate" className="text-[20px] text-on-surface-variant" />
            <label
              htmlFor="locale"
              className="font-label-md text-label-md text-on-surface"
            >
              {t('profile.languageLabel')}
            </label>
          </div>
          <p className="font-body-md text-sm text-on-surface-variant">
            {t('profile.languageDescription')}
          </p>
          <div className="relative">
            <select
              id="locale"
              value={locale}
              disabled={profileLoading || savingLang}
              onChange={(e) => handleLanguageChange(e.target.value as Locale)}
              className="h-[48px] w-full appearance-none rounded-lg border border-outline-variant bg-surface px-4 pr-10 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            {savingLang ? (
              <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            ) : (
              <Icon
                name="expand_more"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline"
              />
            )}
          </div>
          {langError && (
            <p className="font-label-md text-label-md text-error">{langError}</p>
          )}
        </div>

        <hr className="border-surface-container-highest" />

        <PremiumSection />

        <hr className="border-surface-container-highest" />

        <button
          onClick={handleSignOut}
          disabled={busy}
          className="flex min-h-[48px] items-center justify-center gap-sm rounded-full bg-error-container font-label-md text-label-md text-on-error-container transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
        >
          {busy ? <Spinner className="h-4 w-4" /> : <Icon name="logout" className="text-[20px]" />}
          {t('profile.signOut')}
        </button>
      </div>
    </div>
  )
}

/**
 * Premium plan management: upgrade card for free users, billing-portal link for
 * premium users. Also handles the return from Stripe Checkout (?checkout=...),
 * polling the plan until the webhook flips it to premium.
 */
function PremiumSection() {
  const { t } = useI18n()
  const { isPremium, loading, refresh } = usePlan()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plan, setPlan] = useState<BillingPlan>('annual')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [activated, setActivated] = useState(false)

  // Returned from Checkout: poll the plan a few times (the webhook may lag a
  // second or two), then clear the query param.
  useEffect(() => {
    const status = searchParams.get('checkout')
    if (!status) return
    searchParams.delete('checkout')
    setSearchParams(searchParams, { replace: true })
    if (status !== 'success') return

    let cancelled = false
    setProcessing(true)
    ;(async () => {
      for (let i = 0; i < 5 && !cancelled; i++) {
        await refresh()
        await new Promise((r) => setTimeout(r, 1500))
      }
      if (!cancelled) {
        setProcessing(false)
        setActivated(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpgrade() {
    setError(null)
    setBusy(true)
    try {
      window.location.href = await createCheckoutSession(plan)
    } catch {
      setError(t('premium.checkoutError'))
      setBusy(false)
    }
  }

  async function handleManage() {
    setError(null)
    setBusy(true)
    try {
      window.location.href = await createPortalSession()
    } catch {
      setError(t('premium.portalError'))
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-sm">
        <span className="font-label-md text-label-md text-on-surface">{t('premium.sectionTitle')}</span>
        <Spinner className="h-4 w-4 text-primary" />
      </div>
    )
  }

  if (isPremium) {
    return (
      <div className="flex flex-col gap-sm">
        <div className="flex items-center gap-2">
          <Icon name="workspace_premium" fill className="text-[20px] text-primary" />
          <span className="font-label-md text-label-md text-on-surface">{t('premium.youArePremium')}</span>
        </div>
        <p className="font-body-md text-sm text-on-surface-variant">{t('premium.premiumDescription')}</p>
        <button
          onClick={handleManage}
          disabled={busy}
          className="mt-1 flex min-h-[44px] w-fit items-center gap-sm rounded-full border border-outline-variant px-4 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
        >
          {busy ? <Spinner className="h-4 w-4" /> : <Icon name="credit_card" className="text-[20px]" />}
          {t('premium.manageBilling')}
        </button>
        {error && <p className="font-label-md text-label-md text-error">{error}</p>}
      </div>
    )
  }

  const price = plan === 'annual' ? PREMIUM_PRICE_ANNUAL : PREMIUM_PRICE_MONTHLY
  const billed = plan === 'annual' ? t('premium.billedAnnually') : t('premium.billedMonthly')

  return (
    <div className="flex flex-col gap-md rounded-2xl border border-primary/30 bg-primary-container/10 p-md">
      <div className="flex items-center gap-2">
        <Icon name="workspace_premium" fill className="text-[20px] text-primary" />
        <span className="font-headline-md text-headline-md text-on-surface">{t('premium.upgradeTitle')}</span>
      </div>
      <p className="font-body-md text-sm text-on-surface-variant">{t('premium.upgradeDescription')}</p>

      {processing ? (
        <div className="flex items-center gap-sm font-body-md text-sm text-on-surface-variant">
          <Spinner className="h-4 w-4 text-primary" />
          {t('premium.processing')}
        </div>
      ) : activated ? (
        <p className="flex items-center gap-sm font-label-md text-label-md text-primary">
          <Icon name="check_circle" fill className="text-[20px]" />
          {t('premium.activated')}
        </p>
      ) : (
        <>
          {/* Monthly / annual toggle */}
          <div className="flex items-center gap-1 rounded-full bg-surface-container-low p-1">
            {(['monthly', 'annual'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 font-label-md text-label-md transition-colors ${
                  plan === p ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {t(`premium.${p}`)}
                {p === 'annual' && (
                  <span className={`rounded-full px-1.5 text-[10px] ${plan === p ? 'bg-on-primary/20' : 'bg-primary-container text-on-primary-container'}`}>
                    {t('premium.annualSave')}
                  </span>
                )}
              </button>
            ))}
          </div>

          {price && (
            <p className="font-body-md text-on-surface">
              <span className="font-data-display text-data-display">{price}</span>{' '}
              <span className="text-sm text-on-surface-variant">{billed}</span>
            </p>
          )}

          <button
            onClick={handleUpgrade}
            disabled={busy}
            className="flex min-h-[48px] items-center justify-center gap-sm rounded-full bg-primary font-label-md text-label-md text-on-primary transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {busy ? <Spinner className="h-4 w-4" /> : <Icon name="workspace_premium" className="text-[20px]" />}
            {t('premium.upgradeAction')}
          </button>
          {!price && (
            <p className="font-label-md text-label-md text-on-surface-variant">{t('premium.priceAtCheckout')}</p>
          )}
        </>
      )}
      {error && <p className="font-label-md text-label-md text-error">{error}</p>}
    </div>
  )
}
