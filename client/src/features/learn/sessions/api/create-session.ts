import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { userKeys } from '@/features/shared/user'
import {
  SessionSchema,
  type Session,
  type CreateSessionInput,
} from '../types/session.schema'

export const sessionKeys = {
  all: () => ['sessions'] as const,
  list: () => ['sessions', 'list'] as const,
}

export const createSession = (input: CreateSessionInput): Promise<Session> =>
  apiClient.post('/api/sessions', SessionSchema, { body: input })

export const useCreateSession = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      // Sessions affect aggregate stats (totalQuestions, accuracy, streak).
      queryClient.invalidateQueries({ queryKey: userKeys.stats() })
      queryClient.invalidateQueries({ queryKey: sessionKeys.list() })
    },
  })
}
