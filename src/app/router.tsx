
import { useMemo } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { paths } from '@/config/paths';

import {
  default as AppRoot,
} from './routes/app/root';

export const createAppRouter = () =>
  createBrowserRouter([
    {
      path: paths.app.root.path,
      element: (
          <AppRoot />
      ),
      children: [
        {
          path: paths.app.test.path,
          lazy: () =>
            import('./routes/app/test').then(m => ({ Component: m.Test })),
        },
        {
          path: paths.app.abg.path,
          lazy: () =>
            import('./routes/app/abg').then(m => ({ Component: m.abg })),
        },
      ],
    },
    {
      path: '/',
          element: <Navigate to="/app/test" replace />,
    },
    {
      path: '*',
      lazy: () => import('./routes/not-found').then(),
    },
  ], {basename: '/glo-rx/'});

export const AppRouter = () => {
  // const queryClient = useQueryClient();

  const router = useMemo(() => createAppRouter(), []);

  return <RouterProvider router={router} />;
};