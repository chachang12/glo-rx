import path from "path";

export const paths = {
  home: {
    path: '/',
    getHref: () => '/',
  },

//   auth: {
//     register: {
//       path: '/auth/register',
//       getHref: (redirectTo?: string | null | undefined) =>
//         `/auth/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
//     },
//     login: {
//       path: '/auth/login',
//       getHref: (redirectTo?: string | null | undefined) =>
//         `/auth/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
//     },
//   },

  app: {
    root: {
      path: '/app',
      getHref: () => '/app',
    },
    test: {
      path: 'test',
      getHref: () => '/app/test',
    },
    abg: {
      path: 'abg',
      getHref: () => '/app/abg',
    }

  },
} as const;