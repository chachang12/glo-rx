import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryFunction,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'

/**
 * Single, consistent query key used for every disabled/idle resource query.
 * Replaces the ad-hoc per-feature sentinels (`__idle__`, `__noop__`,
 * `__noop_q__`, etc.). A disabled query never runs, so the exact key only
 * needs to be stable and collision-free across the cache.
 */
export const IDLE_QUERY_KEY = ['__idle__'] as const

type ResourceQueryArgs<TData> = {
  /** Key to use when the query is enabled. */
  queryKey: QueryKey
  /** Fetcher; only invoked when `enabled` is true. */
  queryFn: QueryFunction<TData>
  /** Whether the query should run. When false a shared idle key is used. */
  enabled: boolean
} & Omit<
  UseQueryOptions<TData, Error, TData, QueryKey>,
  'queryKey' | 'queryFn' | 'enabled'
>

/**
 * useQuery wrapper for resource fetches that are conditionally enabled (e.g.
 * the id/code/params are optional). Centralizes the "active key when enabled,
 * single shared idle key otherwise" pattern so sentinel naming stays uniform.
 */
export function useResourceQuery<TData>({
  queryKey,
  queryFn,
  enabled,
  ...options
}: ResourceQueryArgs<TData>) {
  return useQuery({
    queryKey: enabled ? queryKey : IDLE_QUERY_KEY,
    queryFn,
    enabled,
    ...options,
  })
}

type DeleteMutationArgs<TData, TVariables> = {
  /** Raw delete call. */
  mutationFn: (variables: TVariables) => Promise<TData>
  /** Query keys to invalidate after a successful delete. */
  invalidateKeys?:
    | QueryKey[]
    | ((data: TData, variables: TVariables) => QueryKey[])
  /** Query keys to remove from the cache after a successful delete. */
  removeKeys?:
    | QueryKey[]
    | ((data: TData, variables: TVariables) => QueryKey[])
} & Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>

/**
 * useMutation wrapper for delete endpoints. Handles the common
 * remove-then-invalidate cache bookkeeping while still letting callers pass
 * extra mutation options. `invalidateKeys`/`removeKeys` may be static arrays
 * or functions of (data, variables) for keys that depend on the deleted id.
 */
export function useDeleteMutation<TData, TVariables>({
  mutationFn,
  invalidateKeys,
  removeKeys,
  onSuccess,
  ...options
}: DeleteMutationArgs<TData, TVariables>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data, variables, onMutateResult, context) => {
      const removes =
        typeof removeKeys === 'function' ? removeKeys(data, variables) : removeKeys
      for (const key of removes ?? []) {
        queryClient.removeQueries({ queryKey: key })
      }
      const invalidations =
        typeof invalidateKeys === 'function'
          ? invalidateKeys(data, variables)
          : invalidateKeys
      for (const key of invalidations ?? []) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      onSuccess?.(data, variables, onMutateResult, context)
    },
    ...options,
  })
}
