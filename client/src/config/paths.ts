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
    customPlanCreate: {
      path: 'plans/custom/new',
      getHref: () => '/app/plans/custom/new',
    },
    customPlanSetup: {
      path: 'plans/custom/:planId/setup',
      getHref: (planId: string) => `/app/plans/custom/${planId}/setup`,
    },
    customPlanDetail: {
      path: 'plans/custom/:planId',
      getHref: (planId: string) => `/app/plans/custom/${planId}`,
    },
    customPlanSettings: {
      path: 'plans/custom/:planId/settings',
      getHref: (planId: string) => `/app/plans/custom/${planId}/settings`,
    },
    sharedPlan: {
      path: 'plans/shared/:shareCode',
      getHref: (shareCode: string) => `/app/plans/shared/${shareCode}`,
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
    admin: {
      path: 'admin',
      getHref: () => '/app/admin',
    },
    adminExam: {
      path: 'admin/exams/:code',
      getHref: (code: string) => `/app/admin/exams/${code}`,
    },
  },
} as const
