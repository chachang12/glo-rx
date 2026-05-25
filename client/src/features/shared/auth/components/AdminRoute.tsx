import { Navigate, Outlet } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useGetMe } from '@/features/shared/user'

export const AdminRoute = () => {
  const { data: user, isLoading, isError } = useGetMe()

  if (isLoading) return <PageLoader />
  if (isError || user?.role !== 'admin') {
    return <Navigate to={paths.app.dashboard.getHref()} replace />
  }
  return <Outlet />
}
