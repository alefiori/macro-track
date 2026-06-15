import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useAppShell } from '@/context/AppShellContext'
import { Icon } from '@/components/ui/Icon'
import { AddFoodModal } from '@/components/addfood/AddFoodModal'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/targets', label: 'Weekly Targets', icon: 'calendar_month' },
  { to: '/foods', label: 'My Foods', icon: 'restaurant_menu' },
  { to: '/profile', label: 'Profile', icon: 'person' },
]

function Sidebar() {
  const { user, signOut } = useAuth()
  const { openAddFood } = useAppShell()

  return (
    <aside className="z-30 hidden h-screen w-[280px] shrink-0 flex-col gap-md border-r border-surface-container-high bg-surface-container-low p-lg shadow-sidebar lg:fixed lg:left-0 lg:top-0 lg:flex">
      {/* Brand */}
      <div className="mb-xl flex items-center gap-md px-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
          <Icon name="track_changes" fill />
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">MacroTrack</h1>
          <p className="font-label-md text-label-md font-normal text-on-surface-variant">
            Health Companion
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-sm">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-md rounded-2xl px-md py-3 font-label-md text-label-md transition-transform active:scale-98 ${
                isActive
                  ? 'bg-primary-container/10 text-primary'
                  : 'text-on-surface-variant hover:bg-secondary-container'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} fill={isActive} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Account + CTA */}
      <div className="mt-auto flex flex-col gap-md">
        <div className="flex items-center justify-between gap-sm rounded-2xl bg-surface-container-lowest px-md py-sm">
          <div className="flex min-w-0 items-center gap-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name="person" className="text-[20px]" />
            </div>
            <span className="truncate font-body-md text-sm text-on-surface-variant" title={user?.email ?? ''}>
              {user?.email}
            </span>
          </div>
          <button
            onClick={() => signOut()}
            title="Sign out"
            className="shrink-0 rounded-full p-2 text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
          >
            <Icon name="logout" className="text-[20px]" />
          </button>
        </div>

        <button
          onClick={() => openAddFood()}
          className="flex w-full items-center justify-center gap-sm rounded-2xl bg-primary px-4 py-3 font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-on-primary-fixed-variant hover:shadow-md"
        >
          <Icon name="add" />
          Add Food
        </button>
      </div>
    </aside>
  )
}

function TopAppBar() {
  return (
    <nav className="fixed top-0 z-40 flex w-full items-center justify-between bg-surface px-container-margin-mobile py-md shadow-sm lg:hidden">
      <div className="font-headline-md text-headline-md font-bold text-primary">MacroTrack</div>
      <NavLink
        to="/profile"
        className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95"
      >
        <Icon name="account_circle" />
      </NavLink>
    </nav>
  )
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-surface-container-high bg-surface px-4 py-2 shadow-bottomnav lg:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-full px-4 py-1 transition-all duration-200 active:scale-90 ${
              isActive
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} fill={isActive} />
              <span className="mt-0.5 font-label-md text-[10px]">
                {item.label === 'Weekly Targets' ? 'Targets' : item.label === 'My Foods' ? 'Foods' : item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export default function AppLayout() {
  const { openAddFood, _addFood, _closeAddFood } = useAppShell()

  return (
    <div className="flex min-h-screen bg-background text-on-surface antialiased">
      <Sidebar />
      <TopAppBar />

      <main className="w-full flex-1 overflow-y-auto pb-[80px] pt-[72px] lg:ml-[280px] lg:pb-0 lg:pt-0">
        <Outlet />
      </main>

      <BottomNav />

      {/* Floating action button (mobile) */}
      <button
        onClick={() => openAddFood()}
        aria-label="Add food"
        className="fixed bottom-[88px] right-container-margin-mobile z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg transition-transform active:scale-95 lg:hidden"
      >
        <Icon name="add" className="text-2xl" />
      </button>

      <AddFoodModal open={_addFood.open} initialMeal={_addFood.meal} onClose={_closeAddFood} />
    </div>
  )
}
