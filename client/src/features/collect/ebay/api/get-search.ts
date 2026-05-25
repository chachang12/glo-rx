import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  SearchResultSchema,
  filtersToQuery,
  type SearchFilters,
  type SearchResult,
} from '../types/ebay.schema'

export const ebayKeys = {
  search: (filters: SearchFilters) => ['collect', 'ebay', 'search', filters] as const,
  aspects: (categoryId: string, q?: string) =>
    ['collect', 'ebay', 'aspects', categoryId, q ?? ''] as const,
  quota: () => ['collect', 'ebay', 'quota'] as const,
}

export const searchEbay = (
  filters: SearchFilters,
  signal?: AbortSignal
): Promise<SearchResult> => {
  const qs = filtersToQuery(filters).toString()
  return apiClient.get(`/api/collect/ebay/search?${qs}`, SearchResultSchema, { signal })
}

export const useSearchEbay = (filters: SearchFilters | null) =>
  useQuery({
    queryKey: filters ? ebayKeys.search(filters) : ['collect', 'ebay', 'search', '__idle__'],
    queryFn: ({ signal }) => searchEbay(filters!, signal),
    enabled: filters !== null,
  })
