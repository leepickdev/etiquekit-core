import {
  PACKET_STATES,
  SCRUTINY_STATES,
  TASK_STATES,
  type PacketState,
  type ScrutinyState,
  type SliceState,
  type SliceStatusSnapshot,
  type TaskState,
} from './types';
import { assertScrutinyState, assertSliceState, assertTaskState } from './guards';

type SliceStatusInput = {
  sliceId: string;
  scrutinyId: string;
  state: SliceState;
  tasks: Array<{
    taskId: string;
    state: TaskState;
    packetId?: string;
  }>;
};

function emptyCounts<T extends readonly string[]>(values: T): Record<T[number], number> {
  return Object.fromEntries(values.map((value) => [value, 0])) as Record<T[number], number>;
}

export function aggregateSliceStatus(
  slice: SliceStatusInput,
  scrutinyState: ScrutinyState,
  packetStates: Record<string, PacketState>,
): SliceStatusSnapshot {
  assertSliceState(slice.state);
  assertScrutinyState(scrutinyState);
  if (!slice.scrutinyId) {
    throw new Error(`slice ${slice.sliceId} missing scrutinyId`);
  }

  const taskCounts = emptyCounts(TASK_STATES);
  const packetCounts = emptyCounts(PACKET_STATES);
  const unresolvedTasks: string[] = [];
  const blockers: string[] = [];
  const seen = new Set<string>();

  for (const task of slice.tasks) {
    assertTaskState(task.state);
    if (seen.has(task.taskId)) {
      throw new Error(`duplicate taskId: ${task.taskId}`);
    }
    seen.add(task.taskId);
    taskCounts[task.state] += 1;
    if (task.state !== 'resolved') {
      unresolvedTasks.push(task.taskId);
    }
    if (task.state === 'blocked' || task.state === 'countered') {
      blockers.push(task.taskId);
    }
    const packetState = task.packetId ? packetStates[task.packetId] : undefined;
    if (packetState) {
      packetCounts[packetState] += 1;
      if (packetState !== 'PROVISIONED' && task.state === 'resolved') {
        blockers.push(`${task.taskId}:packet-not-provisioned`);
      }
    }
  }

  const scrutinyBlocksClose = scrutinyState === 'DEFERRED' || scrutinyState === 'BLOCKED';
  const readyToClose = unresolvedTasks.length === 0 && !scrutinyBlocksClose && blockers.length === 0;

  return {
    sliceId: slice.sliceId,
    sliceState: slice.state,
    scrutinyState,
    packetStates: packetCounts,
    taskStates: taskCounts,
    unresolvedTasks,
    readyToClose,
    blockers,
  };
}

export function deriveTaskStateFromLedger(value: string): TaskState {
  switch (value) {
    case 'incoming':
      return 'incoming';
    case 'pending':
      return 'claimed';
    case 'resolved':
      return 'resolved';
    default:
      return 'incoming';
  }
}

export function isTerminalScrutinyState(value: string): value is Extract<ScrutinyState, 'RESOLVED' | 'VERIFIED' | 'WONT_FIX'> {
  return value === 'RESOLVED' || value === 'VERIFIED' || value === 'WONT_FIX';
}

export function isKnownScrutinyState(value: string): value is ScrutinyState {
  return (SCRUTINY_STATES as readonly string[]).includes(value);
}
