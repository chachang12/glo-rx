import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { LinkResponseSchema, type LinkResponse } from '../types/telegram.schema'

export const linkTelegram = (): Promise<LinkResponse> =>
  apiClient.post('/api/collect/telegram/link', LinkResponseSchema, { body: {} })

export const useLinkTelegram = () =>
  useMutation({
    mutationFn: linkTelegram,
  })
