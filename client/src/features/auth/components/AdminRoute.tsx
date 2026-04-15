import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'

export const AdminRoute = () => {
  const [state, setState] = useState<'loading' | 'admin' | 'denied'>('loading')

  useEffect(() => {
    apiFetch('/api/user/me')
      .then((r) => r.json())
      .then((user) => {
        setState(user.role === 'admin' ? 'admin' : 'denied')
      })
      .catch(() => setState('denied'))
  }, [])

  if (state === 'loading') return <PageLoader />
  if (state === 'denied') return <Navigate to={paths.app.dashboard.getHref()} replace />

  return <Outlet />
}
