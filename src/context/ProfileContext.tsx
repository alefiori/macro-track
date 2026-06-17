import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n'
import { useAuth } from '@/context/AuthContext'

interface ProfileValue {
  /**
   * The user's single language preference. Drives both the UI language and the
   * Open Food Facts result language. Persisted in `profiles.off_language`.
   */
  locale: Locale
  /** Persist a new locale for the current user. */
  setLocale: (code: Locale) => Promise<void>
  /** Alias of {@link locale} as a plain string, for the OFF `lc` query param. */
  offLanguage: string
  loading: boolean
  error: string | null
}

const ProfileContext = createContext<ProfileValue | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locale, setLang] = useState<Locale>(DEFAULT_LOCALE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('profiles')
      .select('off_language')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else if (data && isLocale(data.off_language)) setLang(data.off_language)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function setLocale(code: Locale) {
    if (!user) return
    const previous = locale
    setLang(code) // optimistic
    setError(null)
    // Upsert covers the rare case where the signup trigger hasn't created a row.
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, off_language: code }, { onConflict: 'id' })
    if (error) {
      setLang(previous)
      setError(error.message)
      throw error
    }
  }

  return (
    <ProfileContext.Provider value={{ locale, setLocale, offLanguage: locale, loading, error }}>
      {children}
    </ProfileContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile(): ProfileValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider')
  return ctx
}
