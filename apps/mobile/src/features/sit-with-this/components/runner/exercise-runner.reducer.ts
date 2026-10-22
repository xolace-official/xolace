import type { RunnerPhase, RunnerAction } from './exercise-runner.types';

export function runnerReducer(state: RunnerPhase, action: RunnerAction): RunnerPhase {
  switch (action.type) {
    case 'BEGIN':
      return { kind: 'playing', beatIndex: 0 };

    case 'BEAT_COMPLETE': {
      if (state.kind !== 'playing') return state;
      const next = state.beatIndex + 1;
      if (next >= action.totalBeats) return { kind: 'close', doneEnabled: false };
      return { kind: 'playing', beatIndex: next };
    }

    case 'UNLOCK_DONE':
      if (state.kind !== 'close') return state;
      return { kind: 'close', doneEnabled: true };

    case 'DONE':
      return { kind: 'done' };

    default:
      return state;
  }
}
