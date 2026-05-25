import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  GenerateFlashcardsResponseSchema,
  type GenerateFlashcardsInput,
  type GenerateFlashcardsResponse,
} from '../types/flashcard.schema'

export const generateFlashcards = (
  input: GenerateFlashcardsInput
): Promise<GenerateFlashcardsResponse> =>
  apiClient.post('/api/flashcards/generate', GenerateFlashcardsResponseSchema, {
    body: input,
  })

export const useGenerateFlashcards = () =>
  useMutation({ mutationFn: generateFlashcards })
