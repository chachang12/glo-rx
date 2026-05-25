import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  ExtractTopicsResponseSchema,
  type ExtractTopicsResponse,
} from '../types/custom-plan.schema'

export const extractTopics = (planId: string): Promise<ExtractTopicsResponse> =>
  apiClient.post(
    `/api/custom-plans/${encodeURIComponent(planId)}/extract-topics`,
    ExtractTopicsResponseSchema
  )

export const useExtractTopics = () =>
  useMutation({ mutationFn: extractTopics })

const ConfirmTopicsResponseSchema = z.unknown()

interface ConfirmTopicsArgs {
  planId: string
  topics: string[]
}

export const confirmTopics = ({ planId, topics }: ConfirmTopicsArgs) =>
  apiClient.post(
    `/api/custom-plans/${encodeURIComponent(planId)}/confirm-topics`,
    ConfirmTopicsResponseSchema,
    { body: { topics } }
  )

export const useConfirmTopics = () =>
  useMutation({ mutationFn: confirmTopics })
