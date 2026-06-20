import { RoadmapTrack } from 'glo-practice-tester'
import type { RoadmapDay } from 'glo-practice-tester'
import { Surface } from './_frame'

const noop = () => {}

const NCLEX_DAYS: RoadmapDay[] = [
  {
    id: 'd1',
    dayNumber: 1,
    kind: 'drill',
    status: 'done',
    label: 'Pharmacology Basics',
    topicLabels: ['Drug classes', 'Routes'],
    tag: 'Completed',
  },
  {
    id: 'd2',
    dayNumber: 2,
    kind: 'quiz',
    status: 'done',
    label: 'Fluid & Electrolytes',
    topicLabels: ['Sodium', 'Potassium'],
    tag: 'Completed',
  },
  {
    id: 'd3',
    dayNumber: 3,
    kind: 'drill',
    status: 'today',
    label: 'Acid–Base Balance',
    topicLabels: ['ABG interpretation'],
    tag: 'Today · 38 min',
  },
  {
    id: 'd4',
    dayNumber: 4,
    kind: 'review',
    status: 'future',
    label: 'Cardiac Review',
    topicLabels: ['Dysrhythmias', 'HF'],
    tag: 'Up next',
  },
  {
    id: 'd5',
    dayNumber: 5,
    kind: 'quiz',
    status: 'future',
    label: 'Respiratory',
    topicLabels: ['COPD', 'Oxygenation'],
  },
  {
    id: 'd6',
    dayNumber: 6,
    kind: 'test',
    status: 'exam',
    label: 'NCLEX Exam Day',
    tag: 'EXAM DAY',
  },
]

export const ExamRoadmap = () => (
  <Surface style={{ maxWidth: 720, padding: 0 }}>
    <RoadmapTrack days={NCLEX_DAYS} trackWidth={1180} trackHeight={300} onSelect={noop} />
  </Surface>
)

export const WithSelectedDay = () => (
  <Surface style={{ maxWidth: 720, padding: 0 }}>
    <RoadmapTrack
      days={NCLEX_DAYS}
      selectedId="d3"
      trackWidth={1180}
      trackHeight={300}
      onSelect={noop}
    />
  </Surface>
)

const SHORT_PLAN: RoadmapDay[] = [
  {
    id: 1,
    dayNumber: 1,
    kind: 'drill',
    status: 'today',
    label: 'Maternal–Newborn',
    topicLabels: ['Antepartum'],
    tag: 'Today · 25 min',
  },
  {
    id: 2,
    dayNumber: 2,
    kind: 'quiz',
    status: 'future',
    label: 'Pediatrics',
    topicLabels: ['Growth & development'],
  },
  {
    id: 3,
    dayNumber: 3,
    kind: 'test',
    status: 'exam',
    label: 'Final Assessment',
    tag: 'EXAM DAY',
  },
]

export const ShortPlanFreshStart = () => (
  <Surface style={{ maxWidth: 720, padding: 0 }}>
    <RoadmapTrack days={SHORT_PLAN} trackWidth={680} trackHeight={300} onSelect={noop} />
  </Surface>
)
