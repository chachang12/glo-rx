// Types
export * from './types/plan.schema'

// Queries
export { getPlans, useGetPlans, planKeys } from './api/get-plans'
export { getPlan, useGetPlan } from './api/get-plan'

// Mutations
export { createPlan, useCreatePlan } from './api/create-plan'
export { updatePlan, useUpdatePlan } from './api/update-plan'
export { deletePlan, useDeletePlan } from './api/delete-plan'

// Readiness + roadmap (shared between standard and custom plans)
export {
  getReadiness,
  useGetReadiness,
  ReadinessSchema,
  TopicReadinessSchema,
  type Readiness,
  type TopicReadiness,
  type PlanKind,
} from './api/get-readiness'
export {
  getRoadmap,
  useGetRoadmap,
  generateRoadmap,
  useGenerateRoadmap,
  markRoadmapDayComplete,
  useMarkRoadmapDayComplete,
  RoadmapDaySchema,
  type RoadmapDayData,
} from './api/roadmap'
export {
  generateTopicQuestions,
  useGenerateTopicQuestions,
  type GenerateTopicQuestionsArgs,
} from './api/generate-topic-questions'
