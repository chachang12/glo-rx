import { ExamModel } from '../features/exam/exam.model.js'

// ── Seed data (used for initial DB population) ──────────────────────────────

export const SEED_EXAMS = [
  {
    code: 'nclex-rn',
    label: 'NCLEX-RN',
    category: 'nursing',
    description: 'Registered nurse licensure',
    active: true,
  },
  {
    code: 'nclex-pn',
    label: 'NCLEX-PN',
    category: 'nursing',
    description: 'Practical nurse licensure',
    active: true,
  },
  {
    code: 'mcat',
    label: 'MCAT',
    category: 'medical',
    description: 'Medical school admission',
    active: false,
  },
  {
    code: 'usmle-1',
    label: 'USMLE Step 1',
    category: 'medical',
    description: 'Medical licensing Step 1',
    active: false,
  },
  {
    code: 'lsat',
    label: 'LSAT',
    category: 'law',
    description: 'Law school admission',
    active: false,
  },
  {
    code: 'bar',
    label: 'Bar Exam',
    category: 'law',
    description: 'Attorney licensure',
    active: false,
  },
  {
    code: 'cpa',
    label: 'CPA',
    category: 'accounting',
    description: 'Certified public accountant',
    active: false,
  },
]

// ── Runtime helpers (DB-backed) ─────────────────────────────────────────────

export async function isValidExamCode(code: string): Promise<boolean> {
  if (code.startsWith('custom-')) return true
  const exists = await ExamModel.exists({ code })
  return !!exists
}

export async function seedExams(): Promise<void> {
  for (const exam of SEED_EXAMS) {
    await ExamModel.updateOne(
      { code: exam.code },
      { $setOnInsert: exam },
      { upsert: true }
    )
  }
}
