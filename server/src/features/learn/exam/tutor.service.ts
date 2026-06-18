import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic() // reads ANTHROPIC_API_KEY from env

const MODEL = 'claude-haiku-4-5-20251001'

export interface TutorInput {
  stem: string
  /** Human-readable option list, e.g. "A. Mitochondria\nB. Ribosome". Empty for fill-in. */
  optionsText: string
  correctAnswer: string
  userAnswer: string
  /** The question's own explanation, if any — used as grounding so the tutor stays accurate. */
  explanation?: string
}

export interface TutorExplanation {
  whyWrong: string
  keyConcept: string
  memoryTip: string
}

const tutorTool: Anthropic.Tool = {
  name: 'record_tutor_explanation',
  description: "Record the tutor's explanation of a missed question.",
  input_schema: {
    type: 'object',
    properties: {
      whyWrong: {
        type: 'string',
        description:
          "1-3 sentences explaining why the student's chosen answer is incorrect and why the correct answer is right. Address the student directly and warmly.",
      },
      keyConcept: {
        type: 'string',
        description:
          '1-3 sentences stating the underlying concept the student needs to understand to get this class of question right.',
      },
      memoryTip: {
        type: 'string',
        description:
          'A single short, memorable mnemonic or memory hook for recalling this fact under exam pressure.',
      },
    },
    required: ['whyWrong', 'keyConcept', 'memoryTip'],
  },
}

/**
 * Generates an on-demand "AI Tutor" breakdown for a question the student missed.
 *
 * The question's own `explanation` is passed as grounding so the model elaborates
 * on real material rather than inventing facts — keeping the tutor honest about
 * what the question actually tests.
 */
export async function generateTutorExplanation(
  input: TutorInput
): Promise<TutorExplanation> {
  const prompt = [
    'A student is practicing for a standardized exam and just answered a question incorrectly.',
    'Act as a sharp, encouraging tutor. Be concise and concrete — no filler.',
    '',
    `QUESTION:\n${input.stem}`,
    input.optionsText ? `\nOPTIONS:\n${input.optionsText}` : '',
    `\nCORRECT ANSWER: ${input.correctAnswer}`,
    `STUDENT'S ANSWER: ${input.userAnswer || '(left blank / timed out)'}`,
    input.explanation ? `\nREFERENCE EXPLANATION:\n${input.explanation}` : '',
    '',
    'Call record_tutor_explanation with your breakdown. Do not restate the question.',
  ]
    .filter(Boolean)
    .join('\n')

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    tools: [tutorTool],
    tool_choice: { type: 'tool', name: 'record_tutor_explanation' },
    messages: [{ role: 'user', content: prompt }],
  })

  const block = message.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') {
    throw new Error('Tutor model returned no structured output')
  }

  const out = block.input as Partial<TutorExplanation>
  return {
    whyWrong: out.whyWrong?.trim() || '',
    keyConcept: out.keyConcept?.trim() || '',
    memoryTip: out.memoryTip?.trim() || '',
  }
}
