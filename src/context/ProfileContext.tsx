import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_OFF_LANGUAGE } from '@/lib/constants'
import { useAuth } from '@/context/AuthContext'

interface ProfileValue {
  /** Preferred Open Food Facts language (ISO 639-1). */
  offLanguage: string
  /** Persist a new OFF language for the current user. */
  setOffLanguage: (code: string) => Promise<void>
  loading: boolean
  error: string | null
}

const ProfileContext = createContext<ProfileValue | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [offLanguage, setLang] = useState(DEFAULT_OFF_LANGUAGE)
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
        else if (data) setLang(data.off_language)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function setOffLanguage(code: string) {
    if (!user) return
    const previous = offLanguage
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
    <ProfileContext.Provider value={{ offLanguage, setOffLanguage, loading, error }}>
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
