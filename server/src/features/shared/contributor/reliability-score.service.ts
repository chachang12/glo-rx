import type { Types } from 'mongoose'
import { QuestionBankModel } from '../../learn/exam/exam.model.js'
import { ReviewEventModel } from './review-event.model.js'
import { UserModel } from '../user/user.model.js'

/**
 * Reliability score, in [0, 1]. We measure agreement: for every question the
 * reviewer voted on that has since reached a terminal status (approved or
 * rejected), did their vote align with the consensus?
 *
 * A reviewer with no terminal votes yet gets the default 1.0 — new contributors
 * shouldn't be penalized for having no history.
 */
export async function computeReliabilityScore(reviewerId: Types.ObjectId | string): Promise<number> {
  const events = await ReviewEventModel.find({
    reviewerId,
    notBillableReason: { $ne: 'duplicate' },
  })
    .select('questionId vote')
    .lean()

  if (events.length === 0) return 1

  const questionIds = events.map((e) => e.questionId)
  const questions = await QuestionBankModel.find({
    _id: { $in: questionIds },
    status: { $in: ['approved', 'rejected', 'published'] },
  })
    .select('_id status')
    .lean()

  const consensusByQuestion = new Map<string, 'approve' | 'reject'>()
  for (const q of questions) {
    // published implies approved-then-released.
    consensusByQuestion.set(
      String(q._id),
      q.status === 'rejected' ? 'reject' : 'approve'
    )
  }

  let resolved = 0
  let agreed = 0
  for (const ev of events) {
    const consensus = consensusByQuestion.get(String(ev.questionId))
    if (!consensus) continue
    resolved += 1
    if (consensus === ev.vote) agreed += 1
  }

  if (resolved === 0) return 1
  return agreed / resolved
}

export async function recomputeAllReliabilityScores(): Promise<{ updated: number }> {
  const contributors = await UserModel.find({ role: { $in: ['contributor', 'admin'] } })
    .select('_id')
    .lean()

  let updated = 0
  for (const c of contributors) {
    const score = await computeReliabilityScore(c._id)
    const result = await UserModel.updateOne(
      { _id: c._id, contributor: { $ne: null } },
      { $set: { 'contributor.reliabilityScore': score } }
    )
    if (result.modifiedCount > 0) updated += 1
  }

  return { updated }
}
