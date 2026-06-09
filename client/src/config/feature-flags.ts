const PHASE_MIN = 0
const PHASE_MAX = 5

export function getOfficialPlanProgramPhase(): number {
  const raw = import.meta.env.VITE_OFFICIAL_PLAN_PROGRAM_PHASE
  if (!raw) return PHASE_MIN
  const parsed = Number.parseInt(String(raw), 10)
  if (Number.isNaN(parsed)) return PHASE_MIN
  if (parsed < PHASE_MIN) return PHASE_MIN
  if (parsed > PHASE_MAX) return PHASE_MAX
  return parsed
}

export function isOfficialPlanProgramPhaseAtLeast(phase: number): boolean {
  return getOfficialPlanProgramPhase() >= phase
}
