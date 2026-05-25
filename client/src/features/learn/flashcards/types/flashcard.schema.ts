import { z } from 'zod'

export const FlashcardFormatSchema = z.enum(['remnote', 'anki'])
export type FlashcardFormat = z.infer<typeof FlashcardFormatSchema>

export const GenerateFlashcardsInputSchema = z.object({
  text: z.string().min(1),
  examCode: z.string(),
  format: FlashcardFormatSchema,
})
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>

export const GenerateFlashcardsResponseSchema = z.object({
  flashcards: z.string(),
})
export type GenerateFlashcardsResponse = z.infer<typeof GenerateFlashcardsResponseSchema>
