import {
  ACTOR_KINDS,
  PACKET_STATES,
  SCRUTINY_STATES,
  SLICE_STATES,
  TASK_STATES,
  type SliceState,
  type TaskState,
} from './types';

function assertMember<T extends string>(name: string, value: string, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`invalid ${name}: ${value}`);
  }
  return value as T;
}

export function assertSliceState(value: string): SliceState {
  return assertMember('slice_state', value, SLICE_STATES);
}

export function assertTaskState(value: string): TaskState {
  return assertMember('task_state', value, TASK_STATES);
}

export function assertPacketState(value: string) {
  return assertMember('packet_state', value, PACKET_STATES);
}

export function assertScrutinyState(value: string) {
  return assertMember('scrutiny_state', value, SCRUTINY_STATES);
}

export function assertActorKind(value: string) {
  return assertMember('actor_kind', value, ACTOR_KINDS);
}
