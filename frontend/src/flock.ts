import type { Flock, FlockStage } from './types'

export function flockStageLabel(stage: FlockStage): string {
  switch (stage) {
    case 'brooding':
      return 'Brooding'
    case 'growing':
      return 'Growing'
    case 'pre_lay':
      return 'Pre-lay'
    case 'laying':
      return 'Laying'
    case 'depleted':
      return 'Depleted'
    default: {
      const _exhaustive: never = stage
      return _exhaustive
    }
  }
}

export function flockSummary(flock: Flock): string {
  return `${flock.breed_name} · Week ${flock.age_week} · ${flockStageLabel(flock.stage)}`
}
