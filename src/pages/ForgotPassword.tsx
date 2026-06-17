import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Icon } from '@/components/ui/Icon'
import { Spinner } from '@/components/ui/Spinner'

const inputClass =
  'w-full min-h-[48px] rounded-lg border border-outline-variant bg-surface px-md py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col antialiased">
      <div className="pointer-events-none fixed left-0 top-0 -z-10 h-[512px] w-full bg-gradient-to-b from-surface-container to-background" />

      <main className="relative z-10 flex w-full flex-grow items-center justify-center p-container-margin-mobile md:p-container-margin-desktop">
        <div className="flex w-full max-w-[480px] flex-col gap-lg rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-lg shadow-card md:p-xl">
          <div className="flex flex-col items-center gap-sm text-center">
            <div className="mb-xs flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
              <Icon name="lock_reset" fill className="text-[32px] text-primary" />
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">
              Reset password
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Enter your email and we’ll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="flex flex-col gap-md">
              <p className="rounded-lg bg-primary-container/10 px-md py-sm font-label-md text-label-md text-primary">
                If an account exists for {email}, a reset link is on its way.
              </p>
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="flex min-h-[48px] w-full items-center justify-center rounded-lg bg-primary font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-on-primary-fixed-variant active:scale-[0.98]"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
              {error && (
                <p className="rounded-lg bg-error-container px-md py-sm font-label-md text-label-md text-on-error-container">
                  {error}
                </p>
              )}
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
              <button
                type="submit"
                disabled={busy}
                className="mt-sm flex min-h-[48px] w-full items-center justify-center gap-sm rounded-lg bg-primary font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-on-primary-fixed-variant hover:shadow-md active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? <Spinner className="h-4 w-4" /> : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="text-center font-label-md text-label-md text-primary hover:text-on-primary-fixed-variant"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
