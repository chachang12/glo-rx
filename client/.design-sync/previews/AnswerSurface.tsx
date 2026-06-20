import { AnswerSurface } from 'glo-practice-tester'
import type { SessionQuestion } from '@/features/learn/tests/types/session'
import { Surface } from './_frame'

const mcq: SessionQuestion = {
  _id: 'q1',
  type: 'mcq',
  stem: 'A client with acute pulmonary edema should be treated first with which medication?',
  options: {
    a: 'Spironolactone 25 mg PO',
    b: 'Furosemide 40 mg IV push',
    c: 'Hydrochlorothiazide 25 mg PO',
    d: 'Acetazolamide 250 mg PO',
  },
  answer: ['b'],
}

const noop = () => {}

export const Unanswered = () => (
  <Surface style={{ maxWidth: 600 }}>
    <AnswerSurface question={mcq} selected={[]} isRevealed={false} onSelect={noop} onFib={noop} />
  </Surface>
)

export const Selected = () => (
  <Surface style={{ maxWidth: 600 }}>
    <AnswerSurface question={mcq} selected={['a']} isRevealed={false} onSelect={noop} onFib={noop} />
  </Surface>
)

export const Revealed = () => (
  <Surface style={{ maxWidth: 600 }}>
    <AnswerSurface question={mcq} selected={['a']} isRevealed onSelect={noop} onFib={noop} />
  </Surface>
)
