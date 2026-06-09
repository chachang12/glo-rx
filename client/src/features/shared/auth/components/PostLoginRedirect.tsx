import { Navigate } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useGetMe } from '@/features/shared/user'
import { isOfficialPlanProgramPhaseAtLeast } from '@/config/feature-flags'

/**
 * Used as the `index: true` element under /app. After a fresh login the user
 * lands here (since LoginForm's default callbackURL is /app/dashboard, which
 * resolves to /app → this resolver). Contributors with no other landing target
 * go straight to their queue; everyone else gets the standard dashboard.
 */
export const PostLoginRedirect = () => {
  const { data: user, isLoading } = useGetMe()

  if (isLoading) return <PageLoader />

  const canContribute =
    isOfficialPlanProgramPhaseAtLeast(2) &&
    user?.role === 'contributor' &&
    (user.contributor?.scopes?.length ?? 0) > 0

  if (canContribute) {
    return <Navigate to={paths.app.contribute.queue.getHref()} replace />
  }
  return <Navigate to={paths.app.dashboard.getHref()} replace />
}
