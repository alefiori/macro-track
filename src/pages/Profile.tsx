import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Icon } from '@/components/ui/Icon'
import { Spinner } from '@/components/ui/Spinner'

export default function Profile() {
  const { user, signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-lg px-container-margin-mobile py-lg md:px-container-margin-desktop md:py-xl">
      <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
        Profile
      </h2>

      <div className="flex flex-col gap-lg rounded-2xl bg-surface-container-lowest p-lg shadow-card">
        <div className="flex items-center gap-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Icon name="person" className="text-3xl" />
          </div>
          <div className="min-w-0">
            <p className="font-label-md text-label-md text-on-surface-variant">Signed in as</p>
            <p className="truncate font-headline-md text-headline-md text-on-surface">{user?.email}</p>
          </div>
        </div>

        <hr className="border-surface-container-highest" />

        <button
          onClick={handleSignOut}
          disabled={busy}
          className="flex min-h-[48px] items-center justify-center gap-sm rounded-full bg-error-container font-label-md text-label-md text-on-error-container transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
        >
          {busy ? <Spinner className="h-4 w-4" /> : <Icon name="logout" className="text-[20px]" />}
          Sign out
        </button>
      </div>
    </div>
  )
}
