import { useMemo } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import { paths } from '@/config/paths'
import { ProtectedRoute } from '@/features/auth'

import AppRoot from './routes/app/root'

export const createAppRouter = () =>
  createBrowserRouter(
    [
      // ── Public routes ──────────────────────────────────────────────────
      {
        path: paths.home.path,
        lazy: () =>
          import('./routes/landing').then((m) => ({ Component: m.Landing })),
      },
      {
        path: paths.learn.path,
        lazy: () =>
          import('./routes/learn').then((m) => ({ Component: m.Learn })),
      },
      {
        path: paths.collect.path,
        lazy: () =>
          import('./routes/collect').then((m) => ({ Component: m.Collect })),
      },
      {
        path: paths.auth.login.path,
        lazy: () =>
          import('./routes/auth/login').then((m) => ({ Component: m.LoginPage })),
      },

      // ── Protected routes (/app/*) ─────────────────────────────────────
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: paths.app.root.path,
            element: <AppRoot />,
            children: [
              {
                index: true,
                element: <Navigate to={paths.app.dashboard.getHref()} replace />,
              },
              {
                path: paths.app.dashboard.path,
                lazy: () =>
                  import('./routes/app/dashboard').then((m) => ({
                    Component: m.Dashboard,
                  })),
              },
              {
                path: paths.app.test.path,
                lazy: () =>
                  import('./routes/app/test').then((m) => ({
                    Component: m.Test,
                  })),
              },
              {
                path: paths.app.abg.path,
                lazy: () =>
                  import('./routes/app/abg').then((m) => ({
                    Component: m.abg,
                  })),
              },
              {
                path: paths.app.plans.path,
                lazy: () =>
                  import('./routes/app/plans').then((m) => ({
                    Component: m.Plans,
                  })),
              },
              {
                path: paths.app.plan.path,
                lazy: () =>
                  import('./routes/app/plan-detail').then((m) => ({
                    Component: m.PlanDetail,
                  })),
              },
              {
                path: paths.app.planSettings.path,
                lazy: () =>
                  import('./routes/app/plan-settings').then((m) => ({
                    Component: m.PlanSettings,
                  })),
              },
              {
                path: paths.app.planFlashcards.path,
                lazy: () =>
                  import('./routes/app/plan-flashcards').then((m) => ({
                    Component: m.PlanFlashcards,
                  })),
              },
              {
                path: paths.app.leaderboard.path,
                lazy: () =>
                  import('./routes/app/leaderboard').then((m) => ({
                    Component: m.Leaderboard,
                  })),
              },
              {
                path: paths.app.marketplace.path,
                lazy: () =>
                  import('./routes/app/marketplace').then((m) => ({
                    Component: m.Marketplace,
                  })),
              },
              {
                path: paths.app.results.path,
                lazy: () =>
                  import('./routes/app/results').then((m) => ({
                    Component: m.Results,
                  })),
              },
              {
                path: paths.app.profile.path,
                lazy: () =>
                  import('./routes/app/profile').then((m) => ({
                    Component: m.Profile,
                  })),
              },
              {
                path: paths.app.settings.path,
                lazy: () =>
                  import('./routes/app/settings').then((m) => ({
                    Component: m.Settings,
                  })),
              },
            ],
          },
        ],
      },

      // ── Catch-all ─────────────────────────────────────────────────────
      {
        path: '*',
        lazy: () => import('./routes/not-found').then(),
      },
    ],
    { basename: '/' }
  )

export const AppRouter = () => {
  const router = useMemo(() => createAppRouter(), [])
  return <RouterProvider router={router} />
}
