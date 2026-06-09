import { ReleaseModel } from './release.model.js'

/**
 * Build the filter shape that restricts QuestionBankModel queries to
 * user-visible questions. A question is visible when:
 *   - status === 'published', AND
 *   - releaseId is null (legacy content) OR releaseId is in the live set.
 *
 * Phase 1 has no Release docs yet, so liveReleaseIds is [] and the OR
 * collapses to legacy-only — which matches every existing doc. Phase 3
 * starts producing live releases without changes here.
 */
export async function publishedQuestionFilter(
  examCode: string
): Promise<Record<string, unknown>> {
  const liveReleases = await ReleaseModel.find({ examCode, status: 'live' })
    .select('_id')
    .lean()
  const liveReleaseIds = liveReleases.map((r) => r._id)
  return {
    examCode,
    status: 'published',
    $or: [{ releaseId: null }, { releaseId: { $in: liveReleaseIds } }],
  }
}
