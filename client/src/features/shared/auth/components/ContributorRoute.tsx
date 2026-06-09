import { Navigate, Outlet } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useGetMe } from '@/features/shared/user'

export const ContributorRoute = () => {
  const { data: user, isLoading, isError } = useGetMe()

  if (isLoading) return <PageLoader />
  if (isError) {
    return <Navigate to={paths.app.dashboard.getHref()} replace />
  }

  // Admins act as contributors implicitly so they can review without a scope grant.
  const allowed =
    user?.role === 'admin' || (user?.role === 'contributor' && !!user.contributor)
  if (!allowed) {
    return <Navigate to={paths.app.dashboard.getHref()} replace />
  }

  return <Outlet />
}
