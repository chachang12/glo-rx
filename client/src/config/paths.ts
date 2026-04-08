export const paths = {
  home: {
    path: '/',
    getHref: () => '/',
  },

  learn: {
    path: '/learn',
    getHref: () => '/learn',
  },

  collect: {
    path: '/collect',
    getHref: () => '/collect',
  },

  auth: {
    login: {
      path: '/auth/login',
      getHref: (redirectTo?: string | null) =>
        `/auth/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
    },
  },

  app: {
    root: {
      path: '/app',
      getHref: () => '/app',
    },
    dashboard: {
      path: 'dashboard',
      getHref: () => '/app/dashboard',
    },
    test: {
      path: 'test',
      getHref: () => '/app/test',
    },
    abg: {
      path: 'abg',
      getHref: () => '/app/abg',
    },
    plans: {
      path: 'plans',
      getHref: () => '/app/plans',
    },
    plan: {
      path: 'plans/:examCode',
      getHref: (examCode: string) => `/app/plans/${examCode}`,
    },
    planSettings: {
      path: 'plans/:examCode/settings',
      getHref: (examCode: string) => `/app/plans/${examCode}/settings`,
    },
    planFlashcards: {
      path: 'plans/:examCode/flashcards',
      getHref: (examCode: string) => `/app/plans/${examCode}/flashcards`,
    },
    leaderboard: {
      path: 'leaderboard',
      getHref: () => '/app/leaderboard',
    },
    marketplace: {
      path: 'marketplace',
      getHref: () => '/app/marketplace',
    },
    results: {
      path: 'results',
      getHref: () => '/app/results',
    },
    profile: {
      path: 'profile',
      getHref: () => '/app/profile',
    },
    settings: {
      path: 'settings',
      getHref: () => '/app/settings',
    },
  },
} as const
