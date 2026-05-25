import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { AdminStatsSchema, type AdminStats } from '../types/admin.schema'

export const adminKeys = {
  stats: () => ['admin', 'stats'] as const,
  users: () => ['admin', 'users'] as const,
  exams: () => ['admin', 'exams'] as const,
  exam: (code: string) => ['admin', 'exams', code] as const,
  examOfficialTests: (code: string) => ['admin', 'exams', code, 'official-tests'] as const,
  examQuestions: (code: string) => ['admin', 'exams', code, 'questions'] as const,
  flaggedQuestions: () => ['admin', 'flagged-questions'] as const,
}

export const getAdminStats = (signal?: AbortSignal): Promise<AdminStats> =>
  apiClient.get('/api/admin/stats', AdminStatsSchema, { signal })

export const useGetAdminStats = () =>
  useQuery({ queryKey: adminKeys.stats(), queryFn: ({ signal }) => getAdminStats(signal) })
