import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { detectBrowserLocale, translate, type Locale, type TranslationKey } from '@/lib/i18n'
import { useProfile } from '@/context/ProfileContext'

type TFunction = (key: TranslationKey, params?: Record<string, string | number>) => string

interface I18nValue {
  locale: Locale
  t: TFunction
}

const I18nContext = createContext<I18nValue | undefined>(undefined)

/**
 * Provides the translation function for the active locale. The locale comes
 * from the user's profile (a single preference that also drives Open Food Facts
 * results), so this must sit inside a ProfileProvider.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { locale } = useProfile()
  const value = useMemo<I18nValue>(
    () => ({ locale, t: (key, params) => translate(locale, key, params) }),
    [locale],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Translation function for the active locale. Inside an I18nProvider this is
 * the user's profile locale; on pre-login screens (no provider) it falls back
 * to the browser's language so auth pages are still localized.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (ctx) return ctx
  const locale = detectBrowserLocale()
  return { locale, t: (key, params) => translate(locale, key, params) }
}
