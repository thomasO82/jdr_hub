import type { ApplicationViewerState } from '@jdr-hub/shared'

export type ApplicationView = 'FORM' | 'STATUS' | 'HIDDEN'

export function getApplicationView(state: ApplicationViewerState): ApplicationView {
  if (state.application) return 'STATUS'
  return state.canApply ? 'FORM' : 'HIDDEN'
}
