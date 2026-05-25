/**
 * Adaptive Exponential Moving Average (EMA) mastery algorithm.
 *
 * Instead of simple % correct, mastery uses a rolling EMA where:
 * - Each correct answer moves mastery UP
 * - Each wrong answer moves mastery DOWN
 * - The magnitude of each movement DECREASES as more questions are answered
 *
 * This means:
 * - Early answers have high impact (lets mastery ramp up quickly when learning)
 * - As experience grows, one wrong answer won't tank your score
 * - Mastery always stays responsive (alpha never drops below 0.05)
 *
 * Alpha schedule (smoothing factor):
 *   alpha = max(MIN_ALPHA, 1 / (1 + questionsAnswered * DECAY_RATE))
 *
 *   questionsAnswered=0  → alpha=1.00  (first answer sets the baseline)
 *   questionsAnswered=5  → alpha=0.57
 *   questionsAnswered=10 → alpha=0.40
 *   questionsAnswered=20 → alpha=0.25
 *   questionsAnswered=50 → alpha=0.12
 *   questionsAnswered=100→ alpha=0.06
 *   floor                → alpha=0.05
 */

const MIN_ALPHA = 0.05
const DECAY_RATE = 0.15

/**
 * Compute the new mastery score after answering a question.
 *
 * @param currentMastery - Current mastery score (0-100)
 * @param questionsAnswered - Total questions answered on this topic BEFORE this answer
 * @param correct - Whether the new answer was correct
 * @returns New mastery score (0-100), rounded to nearest integer
 */
export function computeMastery(
  currentMastery: number,
  questionsAnswered: number,
  correct: boolean
): number {
  const alpha = Math.max(MIN_ALPHA, 1 / (1 + questionsAnswered * DECAY_RATE))
  const signal = correct ? 100 : 0
  const newMastery = currentMastery * (1 - alpha) + signal * alpha

  return Math.round(Math.max(0, Math.min(100, newMastery)))
}
