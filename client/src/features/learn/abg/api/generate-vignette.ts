import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  GenerateVignetteResponseSchema,
  type GenerateVignetteInput,
  type GenerateVignetteResponse,
} from '../types/abg.schema'

export const generateAbgVignette = (
  input: GenerateVignetteInput
): Promise<GenerateVignetteResponse> =>
  apiClient.post('/api/abg/vignette', GenerateVignetteResponseSchema, {
    body: input,
  })

export const useGenerateAbgVignette = () =>
  useMutation({ mutationFn: generateAbgVignette })
