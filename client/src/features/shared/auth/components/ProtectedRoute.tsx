import { Navigate, Outlet, useLocation } from 'react-router'
import { useUser } from '../hooks/useUser'
import { paths } from '@/config/paths'

export const ProtectedRoute = () => {
  const { user, isLoading } = useUser()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to={paths.auth.login.getHref(location.pathname)}
        replace
      />
    )
  }

  return <Outlet />
}
