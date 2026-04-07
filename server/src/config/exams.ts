export interface Exam {
  code: string
  label: string
  category: 'nursing' | 'medical' | 'law' | 'accounting'
  description: string
  active: boolean
}

export const EXAMS: Exam[] = [
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

export const EXAM_CODES = EXAMS.map((e) => e.code)
export type ExamCode = (typeof EXAM_CODES)[number]
