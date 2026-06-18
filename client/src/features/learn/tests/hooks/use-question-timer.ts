import { useEffect, useRef, useState } from 'react'

// The timer is driven by a 1-second tick rather than wall-clock timestamps, so
// it needs no Date.now() (which react-hooks/purity forbids during render).

interface UseQuestionTimerArgs {
  /** Total seconds for the question. */
  seconds: number
  /** Tick only while true (e.g. instant mode, before the answer is revealed). */
  active: boolean
  /** Changing this value restarts the countdown (pass the question id). */
  resetKey: string
  /** Fired once when the countdown reaches zero while active. */
  onExpire: () => void
}

/**
 * A per-question countdown. Restarts whenever `resetKey` changes and pauses
 * whenever `active` is false, so revealing an answer freezes the clock.
 * `onExpire` fires exactly once, as the clock hits zero.
 */
export function useQuestionTimer({ seconds, active, resetKey, onExpire }: UseQuestionTimerArgs) {
  const [timeLeft, setTimeLeft] = useState(seconds)
  const [activeKey, setActiveKey] = useState(resetKey)

  // Restart on a new question — the documented "adjust state during render when
  // a prop changes" pattern (setState during render, no refs, no effect).
  if (activeKey !== resetKey) {
    setActiveKey(resetKey)
    setTimeLeft(seconds)
  }

  // Keep the latest onExpire without making it a tick dependency (a changing
  // callback must not restart the 1-second interval).
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!active || timeLeft <= 0) return
    const id = setTimeout(() => {
      if (timeLeft - 1 <= 0) {
        setTimeLeft(0)
        onExpireRef.current()
      } else {
        setTimeLeft(timeLeft - 1)
      }
    }, 1000)
    return () => clearTimeout(id)
  }, [active, timeLeft])

  return { timeLeft, totalSeconds: seconds }
}
