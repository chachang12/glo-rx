import { Schema } from 'mongoose'
import { QUESTION_TYPES, DIFFICULTIES } from './question-types.js'

// Canonical embedded-question field set. The question entity is stored in three
// shapes — the QuestionBankItem collection, OfficialTest.questions[], and
// Test.questions[] — and these base fields were copy-pasted into each schema
// (which is how the type enum drifted between them). Spread this into every
// question schema so the shape is defined exactly once.
export const questionBaseFields = {
  type: {
    type: String,
    enum: QUESTION_TYPES,
    default: 'mcq',
  },
  stem: { type: String, required: true },
  // { "A": "...", "B": "..." } for choice types, or string[] for ordered.
  options: { type: Schema.Types.Mixed, required: true },
  answer: { type: [String], required: true },
  explanation: { type: String, default: '' },
  topics: { type: [String], default: [] },
  difficulty: {
    type: String,
    enum: DIFFICULTIES,
    default: null,
  },
}

// The moderation counters that the bank and official-test questions carry but
// community Tests do not.
export const questionReportFields = {
  reportCount: { type: Number, default: 0 },
  reportedBy: { type: [String], default: [] },
}
