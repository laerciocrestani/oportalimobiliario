export const WIZARD_LAST_STEP = 3

export const WIZARD_STEPS = [
  { id: 1, label: 'Identidade' },
  { id: 2, label: 'Estrutura' },
  { id: 3, label: 'Mídia' },
] as const

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id']

/** Last persisted `wizard_step` → UI step. Caps legacy drafts that still have 4. */
export function resumeWizardUiStep(
  savedStep: number | null | undefined,
  fromState?: number,
): number {
  if (fromState != null && fromState >= 1) {
    return Math.min(fromState, WIZARD_LAST_STEP)
  }

  const saved = savedStep ?? 1

  if (saved <= 2) {
    return 2
  }

  return WIZARD_LAST_STEP
}
