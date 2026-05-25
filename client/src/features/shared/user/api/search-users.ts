import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  UserSearchResultSchema,
  type UserSearchResult,
} from '../types/user.schema'
import { userKeys } from './get-me'

const SearchUsersResponseSchema = z.array(UserSearchResultSchema)

export const searchUsers = (
  q: string,
  signal?: AbortSignal
): Promise<UserSearchResult[]> =>
  apiClient.get(
    `/api/user/search?q=${encodeURIComponent(q)}`,
    SearchUsersResponseSchema,
    { signal }
  )

export const useSearchUsers = (q: string) =>
  useQuery({
    queryKey: userKeys.search(q),
    queryFn: ({ signal }) => searchUsers(q, signal),
    enabled: q.trim().length >= 3,
  })
