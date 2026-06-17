import { Navigate, Outlet } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useGetMe } from '@/features/shared/user'

export const ResearcherRoute = () => {
  const { data: user, isLoading, isError } = useGetMe()

  if (isLoading) return <PageLoader />
  if (isError) {
    return <Navigate to={paths.app.dashboard.getHref()} replace />
  }

  const allowed = user?.role === 'admin' || user?.role === 'researcher'
  if (!allowed) {
    return <Navigate to={paths.app.dashboard.getHref()} replace />
  }

  return <Outlet />
}
