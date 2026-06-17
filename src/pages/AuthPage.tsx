import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Icon } from '@/components/ui/Icon'
import { Spinner } from '@/components/ui/Spinner'

type Tab = 'signin' | 'signup'

const inputClass =
  'w-full min-h-[48px] rounded-lg border border-outline-variant bg-surface px-md py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors'

export default function AuthPage({ initialTab = 'signin' }: { initialTab?: Tab }) {
  const { session, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (tab === 'signup' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      if (tab === 'signin') {
        await signIn(email, password)
        navigate('/', { replace: true })
      } else {
        const { needsConfirmation } = await signUp(email, password)
        if (needsConfirmation) {
          setNotice('Check your inbox to confirm your email, then sign in.')
          setTab('signin')
        } else {
          navigate('/', { replace: true })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  function switchTab(next: Tab) {
    setTab(next)
    setError(null)
    setNotice(null)
  }

  return (
    <div className="relative flex min-h-screen flex-col antialiased">
      {/* Ambient decorative background */}
      <div className="pointer-events-none fixed left-0 top-0 -z-10 h-[512px] w-full bg-gradient-to-b from-surface-container to-background" />

      <main className="relative z-10 flex w-full flex-grow items-center justify-center p-container-margin-mobile md:p-container-margin-desktop">
        <div className="flex w-full max-w-[480px] flex-col gap-lg rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-lg shadow-card md:p-xl">
          {/* Branding */}
          <div className="flex flex-col items-center gap-sm text-center">
            <div className="mb-xs flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
              <Icon name="donut_small" fill className="text-[32px] text-primary" />
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary md:font-headline-lg md:text-headline-lg">
              MacroTrack
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Track your macros, every day.
            </p>
          </div>

          {/* Tabs */}
          <div className="mt-sm flex w-full border-b border-surface-container-high">
            <button
              type="button"
              onClick={() => switchTab('signin')}
              className={`flex-1 pb-sm text-center font-label-md text-label-md transition-colors ${
                tab === 'signin'
                  ? 'border-b-2 border-primary font-bold text-primary'
                  : 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`flex-1 pb-sm text-center font-label-md text-label-md transition-colors ${
                tab === 'signup'
                  ? 'border-b-2 border-primary font-bold text-primary'
                  : 'border-b-2 border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign Up
            </button>
          </div>

          {notice && (
            <p className="rounded-lg bg-primary-container/10 px-md py-sm font-label-md text-label-md text-primary">
              {notice}
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-error-container px-md py-sm font-label-md text-label-md text-on-error-container">
              {error}
            </p>
          )}

          <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
                Password
              </label>
              <div className="relative w-full">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                  placeholder={tab === 'signin' ? '••••••••' : 'Create a password'}
                  className={`${inputClass} pr-[48px]`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-0 flex h-[48px] w-[48px] items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'visibility' : 'visibility_off'} />
                </button>
              </div>
            </div>

            {tab === 'signup' && (
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="confirm">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className={inputClass}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            )}

            {tab === 'signin' && (
              <div className="mt-[-8px] flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="font-label-md text-label-md text-primary transition-colors hover:text-on-primary-fixed-variant"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-sm flex min-h-[48px] w-full items-center justify-center gap-sm rounded-lg bg-primary font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-on-primary-fixed-variant hover:shadow-md active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? (
                <Spinner className="h-4 w-4" />
              ) : tab === 'signin' ? (
                <>
                  <span>Sign in</span>
                  <Icon name="arrow_forward" className="text-[18px]" />
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>

            {tab === 'signup' && (
              <p className="mt-sm text-center font-body-md text-body-md text-on-surface-variant">
                By signing up, you agree to our{' '}
                <span className="text-primary">Terms</span> and{' '}
                <span className="text-primary">Privacy Policy</span>.
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}
