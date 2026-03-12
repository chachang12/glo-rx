
import { useMemo } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { paths } from '@/config/paths';

import {
  default as AppRoot,
} from './routes/app/root';

export const createAppRouter = () =>
  createBrowserRouter([
    // {
    //   path: paths.home.path,
    //   lazy: () => import('./routes/landing').then(convert(queryClient)),
    // },
    // {
    //   path: paths.auth.register.path,
    //   lazy: () => import('./routes/auth/register').then(convert(queryClient)),
    // },
    // {
    //   path: paths.auth.login.path,
    //   lazy: () => import('./routes/auth/login').then(convert(queryClient)),
    // },
    {
      path: paths.app.root.path,
      element: (
          <AppRoot />
      ),
      children: [
        {
          path: paths.app.test.path,
          lazy: () =>
            import('./routes/app/test').then(),
        },
      ],
    },
    {
      path: '*',
      lazy: () => import('./routes/not-found').then(),
    },
  ]);

export const AppRouter = () => {
  // const queryClient = useQueryClient();

  const router = useMemo(() => createAppRouter(), []);

  return <RouterProvider router={router} />;
};