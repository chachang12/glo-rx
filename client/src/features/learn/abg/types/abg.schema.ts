import { z } from 'zod'

export const AbgValuesSchema = z.object({
  pH: z.number(),
  PaCO2: z.number(),
  HCO3: z.number(),
  PaO2: z.number(),
})
export type AbgValues = z.infer<typeof AbgValuesSchema>

export const GenerateVignetteInputSchema = z.object({
  values: AbgValuesSchema,
  imbalance: z.string(),
  compensation: z.string(),
})
export type GenerateVignetteInput = z.infer<typeof GenerateVignetteInputSchema>

export const GenerateVignetteResponseSchema = z.object({
  vignette: z.string(),
})
export type GenerateVignetteResponse = z.infer<typeof GenerateVignetteResponseSchema>
