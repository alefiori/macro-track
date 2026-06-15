import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AppShellProvider } from '@/context/AppShellContext'
import { RequireAuth } from '@/components/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'
import AuthPage from '@/pages/AuthPage'
import ForgotPassword from '@/pages/ForgotPassword'
import Dashboard from '@/pages/Dashboard'
import Targets from '@/pages/Targets'
import MyFoods from '@/pages/MyFoods'
import CreateCustomFood from '@/pages/CreateCustomFood'
import Profile from '@/pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/signin" element={<AuthPage initialTab="signin" />} />
          <Route path="/signup" element={<AuthPage initialTab="signup" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Guarded app routes */}
          <Route
            element={
              <RequireAuth>
                <AppShellProvider>
                  <AppLayout />
                </AppShellProvider>
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/targets" element={<Targets />} />
            <Route path="/foods" element={<MyFoods />} />
            <Route path="/foods/new" element={<CreateCustomFood />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
