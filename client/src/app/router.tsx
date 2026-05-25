import { useMemo } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import { paths } from '@/config/paths'
import { ProtectedRoute, AdminRoute } from '@/features/shared/auth'

import AppRoot from './routes/learn/root'

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
                  import('./routes/learn/dashboard').then((m) => ({
                    Component: m.Dashboard,
                  })),
              },
              {
                path: paths.app.test.path,
                lazy: () =>
                  import('./routes/learn/test').then((m) => ({
                    Component: m.Test,
                  })),
              },
              {
                path: paths.app.abg.path,
                lazy: () =>
                  import('./routes/learn/abg').then((m) => ({
                    Component: m.abg,
                  })),
              },
              {
                path: paths.app.plans.path,
                lazy: () =>
                  import('./routes/learn/plans').then((m) => ({
                    Component: m.Plans,
                  })),
              },
              {
                path: paths.app.customPlanCreate.path,
                lazy: () =>
                  import('./routes/learn/custom-plan-create').then((m) => ({
                    Component: m.CustomPlanCreate,
                  })),
              },
              {
                path: paths.app.customPlanSetup.path,
                lazy: () =>
                  import('./routes/learn/custom-plan-setup').then((m) => ({
                    Component: m.CustomPlanSetup,
                  })),
              },
              {
                path: paths.app.customPlanSettings.path,
                lazy: () =>
                  import('./routes/learn/custom-plan-settings').then((m) => ({
                    Component: m.CustomPlanSettings,
                  })),
              },
              {
                path: paths.app.customPlanDetail.path,
                lazy: () =>
                  import('./routes/learn/plan-detail').then((m) => ({
                    Component: m.CustomPlanDetail,
                  })),
              },
              {
                path: paths.app.sharedPlan.path,
                lazy: () =>
                  import('./routes/learn/shared-plan').then((m) => ({
                    Component: m.SharedPlan,
                  })),
              },
              {
                path: paths.app.plan.path,
                lazy: () =>
                  import('./routes/learn/plan-detail').then((m) => ({
                    Component: m.PlanDetail,
                  })),
              },
              {
                path: paths.app.planSettings.path,
                lazy: () =>
                  import('./routes/learn/plan-settings').then((m) => ({
                    Component: m.PlanSettings,
                  })),
              },
              {
                path: paths.app.planFlashcards.path,
                lazy: () =>
                  import('./routes/learn/plan-flashcards').then((m) => ({
                    Component: m.PlanFlashcards,
                  })),
              },
              {
                path: paths.app.leaderboard.path,
                lazy: () =>
                  import('./routes/learn/leaderboard').then((m) => ({
                    Component: m.Leaderboard,
                  })),
              },
              {
                path: paths.app.marketplace.path,
                lazy: () =>
                  import('./routes/learn/marketplace').then((m) => ({
                    Component: m.Marketplace,
                  })),
              },
              {
                path: paths.app.results.path,
                lazy: () =>
                  import('./routes/learn/results').then((m) => ({
                    Component: m.Results,
                  })),
              },
              {
                path: paths.app.profile.path,
                lazy: () =>
                  import('./routes/learn/profile').then((m) => ({
                    Component: m.Profile,
                  })),
              },
              {
                path: paths.app.settings.path,
                lazy: () =>
                  import('./routes/learn/settings').then((m) => ({
                    Component: m.Settings,
                  })),
              },
              {
                element: <AdminRoute />,
                children: [
                  {
                    path: paths.app.admin.path,
                    lazy: () =>
                      import('./routes/learn/admin').then((m) => ({
                        Component: m.AdminDashboard,
                      })),
                  },
                  {
                    path: paths.app.adminExam.path,
                    lazy: () =>
                      import('./routes/learn/admin-exam').then((m) => ({
                        Component: m.AdminExamEditor,
                      })),
                  },
                ],
              },

              // ── Collect ──────────────────────────────────────────────
              {
                path: paths.app.collect.root.path,
                lazy: () =>
                  import('./routes/collect/root').then((m) => ({
                    Component: m.default,
                  })),
                children: [
                  {
                    index: true,
                    element: <Navigate to={paths.app.collect.dashboard.getHref()} replace />,
                  },
                  {
                    path: 'dashboard',
                    lazy: () =>
                      import('./routes/collect/dashboard').then((m) => ({
                        Component: m.CollectDashboard,
                      })),
                  },
                  {
                    path: 'search',
                    lazy: () =>
                      import('./routes/collect/search').then((m) => ({
                        Component: m.CollectSearch,
                      })),
                  },
                  {
                    path: 'watches',
                    lazy: () =>
                      import('./routes/collect/watches').then((m) => ({
                        Component: m.CollectWatches,
                      })),
                  },
                  {
                    path: 'watches/new',
                    lazy: () =>
                      import('./routes/collect/watch-new').then((m) => ({
                        Component: m.CollectWatchNew,
                      })),
                  },
                  {
                    path: 'watches/:id',
                    lazy: () =>
                      import('./routes/collect/watch-detail').then((m) => ({
                        Component: m.CollectWatchDetail,
                      })),
                  },
                  {
                    path: 'profile',
                    lazy: () =>
                      import('./routes/collect/profile').then((m) => ({
                        Component: m.CollectProfile,
                      })),
                  },
                ],
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
