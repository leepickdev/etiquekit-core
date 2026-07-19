type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = Record<string, unknown>;

export const EXECUTION_BINDING_SCHEMA = 'execution_binding.v0';
export const EXECUTION_TERMINAL_RECEIPT_SCHEMA = 'execution_terminal_receipt.v0';
export const PARENT_ACCEPTANCE_SCHEMA = 'parent_acceptance.v0';

export const EXECUTION_BINDING_REFUSALS = [
  'execution_binding_invalid',
  'execution_binding_expired',
  'execution_binding_revoked',
  'execution_binding_revoked_at_point_of_effect',
  'execution_binding_parent_mismatch',
  'execution_binding_occupancy_mismatch',
  'execution_binding_session_mismatch',
  'execution_binding_runner_mismatch',
  'execution_binding_epoch_stale',
  'execution_binding_occupancy_inactive',
  'execution_binding_execution_mismatch',
  'execution_binding_subrun_mismatch',
  'execution_binding_task_mismatch',
  'execution_binding_profile_mismatch',
  'execution_binding_scope_mismatch',
  'execution_binding_capability_forbidden',
  'execution_binding_capability_requires_external_gate',
  'execution_binding_capability_not_allowed',
  'execution_binding_capability_boundary_mismatch',
  'execution_binding_context_mismatch',
  'execution_binding_context_hash_mismatch',
  'execution_binding_requested_output_mismatch',
] as const;

export const EXECUTION_IDENTITY_REFUSALS = [
  'session_binding_identity_invalid',
  'session_binding_canonical_seat_mismatch',
  'session_binding_epoch_stale',
  'session_binding_duplicate_occupancy',
  'session_binding_occupancy_not_permitted',
] as const;

export const TERMINAL_RECEIPT_REFUSALS = [
  'terminal_receipt_invalid',
  'terminal_receipt_binding_mismatch',
  'terminal_receipt_execution_mismatch',
  'terminal_receipt_task_mismatch',
  'terminal_receipt_profile_mismatch',
  'terminal_receipt_context_mismatch',
  'terminal_receipt_requested_output_mismatch',
  'terminal_receipt_duplicate',
  'terminal_receipt_already_exists',
  'terminal_receipt_concurrent_write',
] as const;

export const PARENT_ACCEPTANCE_REFUSALS = [
  'parent_acceptance_invalid',
  'parent_acceptance_receipt_mismatch',
  'parent_acceptance_hash_mismatch',
  'parent_acceptance_parent_mismatch',
] as const;

export type ExecutionBindingRefusal = (typeof EXECUTION_BINDING_REFUSALS)[number];
export type ExecutionIdentityRefusal = (typeof EXECUTION_IDENTITY_REFUSALS)[number];
export type TerminalReceiptRefusal = (typeof TERMINAL_RECEIPT_REFUSALS)[number];
export type ParentAcceptanceRefusal = (typeof PARENT_ACCEPTANCE_REFUSALS)[number];

export interface RunnerBindingActual {
  runtime: string;
  provider: string;
  model: string;
  profile: string;
}

export interface ExecutionIdentity {
  seat_id: string;
  occupancy_id: string;
  session_id: string;
  runner_binding_actual: RunnerBindingActual;
  binding_epoch: number;
}

export interface ExecutionBinding {
  schema: typeof EXECUTION_BINDING_SCHEMA;
  binding_id: string;
  lease_ref: string;
  issued_at: string;
  expires_at: string;
  parent_seat_id: string;
  execution_identity: ExecutionIdentity;
  execution: {
    execution_id: string;
    subrun_id: string;
    parent_execution_id: string | null;
  };
  task: {
    task_id: string;
    task_ref: string;
  };
  profile_id: string;
  scope_ref: string;
  capabilities: {
    allowed: string[];
    gated: string[];
    forbidden: string[];
  };
  context: {
    context_ref: string;
    canonical_hash: string;
    privacy_boundary: string[];
    capability_boundary: string[];
    requested_output_ref: string;
  };
  revocation: {
    canonical_revocation_ref: string | null;
  };
  authority_granted: false;
}

export interface ExecutionBindingRequest {
  parent_seat_id: string;
  occupancy_id: string;
  session_id: string;
  runner_binding_actual: RunnerBindingActual;
  binding_epoch: number;
  execution_id: string;
  subrun_id: string;
  task_id: string;
  profile_id: string;
  scope_ref: string;
  capability: string;
  context_ref: string;
  context_hash: string;
  requested_output_ref: string;
  canonical_state: {
    at: string;
    revoked_binding_ids?: string[];
    occupancy_active: boolean;
    current_binding_epoch: number;
  };
}

export interface ExecutionBindingEvaluation {
  schema: 'execution-binding-evaluation.v0';
  binding_ref: string | null;
  verdict: 'legitimate' | 'blocked';
  reasons: ExecutionBindingRefusal[];
  authority_granted: false;
  point_of_effect_checked: true;
}

export interface ExecutionOccupancyState {
  identity: ExecutionIdentity;
  status: 'active' | 'inactive';
}

export interface ExecutionIdentityTransitionInput {
  candidate: unknown;
  current: ExecutionOccupancyState[];
  policy: {
    canonical_seat_id: string;
    permitted_occupancy_ids: string[];
    allow_multiple_occupancies: boolean;
  };
}

export interface ExecutionIdentityTransition {
  schema: 'execution-identity-transition.v0';
  verdict: 'legitimate' | 'blocked';
  reasons: ExecutionIdentityRefusal[];
  occupancy_slot: string | null;
  next: ExecutionOccupancyState[];
  authority_granted: false;
}

export interface ExecutionTerminalReceipt {
  schema: typeof EXECUTION_TERMINAL_RECEIPT_SCHEMA;
  receipt_id: string;
  binding_ref: string;
  lease_ref: string;
  parent_seat_id: string;
  execution_id: string;
  subrun_id: string;
  task_id: string;
  profile_id: string;
  context_ref: string;
  context_hash: string;
  requested_output_ref: string;
  terminal_sequence: number;
  outcome: 'success' | 'partial' | 'blocked' | 'cancelled';
  evidence_refs: string[];
  parent_acceptance_required: true;
  authority_granted: false;
}

export interface TerminalReceiptState {
  terminal_version: number;
  existing_receipt: ExecutionTerminalReceipt | null;
}

export interface TerminalReceiptWriteEvaluation {
  schema: 'terminal-receipt-write-evaluation.v0';
  verdict: 'append' | 'idempotent' | 'blocked';
  reasons: TerminalReceiptRefusal[];
  receipt_hash: string | null;
  next_terminal_version: number;
  authority_granted: false;
}

export interface ParentAcceptance {
  schema: typeof PARENT_ACCEPTANCE_SCHEMA;
  acceptance_id: string;
  receipt_ref: string;
  receipt_hash: string;
  accepted_by_seat_id: string;
  accepted_at: string;
  authority_granted: false;
}

export interface ParentAcceptanceEvaluation {
  schema: 'parent-acceptance-evaluation.v0';
  verdict: 'accepted' | 'blocked';
  reasons: ParentAcceptanceRefusal[];
  canonical_bridge_allowed: boolean;
  authority_granted: false;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown, field: string): JsonRecord {
  if (!isRecord(value)) throw new Error(`${field} must be an object`);
  return value;
}

function asString(record: JsonRecord, field: string): string {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function asNullableString(record: JsonRecord, field: string): string | null {
  const value = record[field];
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string or null`);
  }
  return value.trim();
}

function asStringArray(record: JsonRecord, field: string, allowEmpty = false): string[] {
  const value = record[field];
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${field} must be ${allowEmpty ? 'a' : 'a non-empty'} string array`);
  }
  return value.map((item) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(`${field} must contain only non-empty strings`);
    }
    return item.trim();
  });
}

function asPositiveInteger(record: JsonRecord, field: string): number {
  const value = record[field];
  if (!Number.isInteger(value) || Number(value) < 1) throw new Error(`${field} must be a positive integer`);
  return Number(value);
}

function asFalse(record: JsonRecord, field: string): false {
  if (record[field] !== false) throw new Error(`${field} must be false`);
  return false;
}

function asTrue(record: JsonRecord, field: string): true {
  if (record[field] !== true) throw new Error(`${field} must be true`);
  return true;
}

function asIso(record: JsonRecord, field: string): string {
  const value = asString(record, field);
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) throw new Error(`${field} must be an ISO-8601 timestamp`);
  return timestamp.toISOString();
}

function asHash(record: JsonRecord, field: string): string {
  const value = asString(record, field).toLowerCase();
  if (!/^sha256:[0-9a-f]{64}$/.test(value)) throw new Error(`${field} must be a sha256 hash`);
  return value;
}

function assertPortableRef(value: string, field: string): string {
  if (value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value)) {
    throw new Error(`${field} must not be a local absolute path`);
  }
  if (/[a-z][a-z0-9+.-]*:\/\//i.test(value)) throw new Error(`${field} must not be a URL`);
  return value;
}

function parseRunnerBinding(value: unknown): RunnerBindingActual {
  const record = asRecord(value, 'runner_binding_actual');
  return {
    runtime: asString(record, 'runtime'),
    provider: asString(record, 'provider'),
    model: asString(record, 'model'),
    profile: asString(record, 'profile'),
  };
}

export function parseExecutionIdentity(value: unknown): ExecutionIdentity {
  const record = asRecord(value, 'execution identity');
  return {
    seat_id: asString(record, 'seat_id'),
    occupancy_id: asString(record, 'occupancy_id'),
    session_id: asString(record, 'session_id'),
    runner_binding_actual: parseRunnerBinding(record.runner_binding_actual),
    binding_epoch: asPositiveInteger(record, 'binding_epoch'),
  };
}

export function parseExecutionBinding(value: unknown): ExecutionBinding {
  const record = asRecord(value, 'execution binding');
  if (record.schema !== EXECUTION_BINDING_SCHEMA) throw new Error(`schema must be ${EXECUTION_BINDING_SCHEMA}`);
  const identity = parseExecutionIdentity(record.execution_identity);
  const parentSeatId = asString(record, 'parent_seat_id');
  if (identity.seat_id !== parentSeatId) throw new Error('execution_identity.seat_id must equal parent_seat_id');
  const issuedAt = asIso(record, 'issued_at');
  const expiresAt = asIso(record, 'expires_at');
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) throw new Error('expires_at must be after issued_at');
  const execution = asRecord(record.execution, 'execution');
  const task = asRecord(record.task, 'task');
  const capabilities = asRecord(record.capabilities, 'capabilities');
  const allowed = asStringArray(capabilities, 'allowed');
  const gated = asStringArray(capabilities, 'gated', true);
  const forbidden = asStringArray(capabilities, 'forbidden', true);
  if (allowed.some((item) => gated.includes(item) || forbidden.includes(item)) || gated.some((item) => forbidden.includes(item))) {
    throw new Error('capability sets must not overlap');
  }
  const context = asRecord(record.context, 'context');
  const revocation = asRecord(record.revocation, 'revocation');
  const canonicalRevocationRef = asNullableString(revocation, 'canonical_revocation_ref');
  return {
    schema: EXECUTION_BINDING_SCHEMA,
    binding_id: asString(record, 'binding_id'),
    lease_ref: assertPortableRef(asString(record, 'lease_ref'), 'lease_ref'),
    issued_at: issuedAt,
    expires_at: expiresAt,
    parent_seat_id: parentSeatId,
    execution_identity: identity,
    execution: {
      execution_id: asString(execution, 'execution_id'),
      subrun_id: asString(execution, 'subrun_id'),
      parent_execution_id: asNullableString(execution, 'parent_execution_id'),
    },
    task: {
      task_id: asString(task, 'task_id'),
      task_ref: assertPortableRef(asString(task, 'task_ref'), 'task.task_ref'),
    },
    profile_id: asString(record, 'profile_id'),
    scope_ref: assertPortableRef(asString(record, 'scope_ref'), 'scope_ref'),
    capabilities: { allowed, gated, forbidden },
    context: {
      context_ref: assertPortableRef(asString(context, 'context_ref'), 'context.context_ref'),
      canonical_hash: asHash(context, 'canonical_hash'),
      privacy_boundary: asStringArray(context, 'privacy_boundary'),
      capability_boundary: asStringArray(context, 'capability_boundary'),
      requested_output_ref: assertPortableRef(asString(context, 'requested_output_ref'), 'context.requested_output_ref'),
    },
    revocation: {
      canonical_revocation_ref: canonicalRevocationRef === null
        ? null
        : assertPortableRef(canonicalRevocationRef, 'revocation.canonical_revocation_ref'),
    },
    authority_granted: asFalse(record, 'authority_granted'),
  };
}

function canonicalize(value: JsonValue, seen: Set<object>): string {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonical JSON does not allow non-finite numbers');
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (seen.has(value)) throw new Error('canonical JSON does not allow cycles');
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item, seen)).join(',')}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key], seen)}`).join(',')}}`;
  } finally {
    seen.delete(value);
  }
}

export function canonicalJson(value: JsonValue): string {
  return canonicalize(value, new Set<object>());
}

function rotateRight(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256Hex(input: string): string {
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const bytes = new TextEncoder().encode(input);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  let bitLength = BigInt(bytes.length) * 8n;
  for (let index = 0; index < 8; index += 1) {
    padded[padded.length - 1 - index] = Number(bitLength & 0xffn);
    bitLength >>= 8n;
  }
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      words[index] = ((padded[start] << 24) | (padded[start + 1] << 16) | (padded[start + 2] << 8) | padded[start + 3]) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choose + constants[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((value) => value.toString(16).padStart(8, '0')).join('');
}

export function canonicalContextHash(value: JsonValue): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}

function sameRunner(left: RunnerBindingActual, right: RunnerBindingActual): boolean {
  return canonicalJson(left as unknown as JsonValue) === canonicalJson(right as unknown as JsonValue);
}

function addReason<T extends string>(reasons: T[], reason: T, condition: boolean): void {
  if (condition && !reasons.includes(reason)) reasons.push(reason);
}

export function evaluateExecutionBinding(rawBinding: unknown, request: ExecutionBindingRequest): ExecutionBindingEvaluation {
  let binding: ExecutionBinding;
  try {
    binding = parseExecutionBinding(rawBinding);
  } catch {
    return {
      schema: 'execution-binding-evaluation.v0',
      binding_ref: null,
      verdict: 'blocked',
      reasons: ['execution_binding_invalid'],
      authority_granted: false,
      point_of_effect_checked: true,
    };
  }
  const reasons: ExecutionBindingRefusal[] = [];
  const identity = binding.execution_identity;
  const at = Date.parse(request.canonical_state.at);
  addReason(reasons, 'execution_binding_invalid', !Number.isFinite(at));
  addReason(reasons, 'execution_binding_expired', Number.isFinite(at) && at >= Date.parse(binding.expires_at));
  addReason(reasons, 'execution_binding_revoked', binding.revocation.canonical_revocation_ref !== null);
  addReason(reasons, 'execution_binding_revoked_at_point_of_effect', (request.canonical_state.revoked_binding_ids ?? []).includes(binding.binding_id));
  addReason(reasons, 'execution_binding_parent_mismatch', request.parent_seat_id !== binding.parent_seat_id);
  addReason(reasons, 'execution_binding_occupancy_mismatch', request.occupancy_id !== identity.occupancy_id);
  addReason(reasons, 'execution_binding_session_mismatch', request.session_id !== identity.session_id);
  addReason(reasons, 'execution_binding_runner_mismatch', !sameRunner(request.runner_binding_actual, identity.runner_binding_actual));
  addReason(reasons, 'execution_binding_epoch_stale', request.binding_epoch !== identity.binding_epoch || request.canonical_state.current_binding_epoch !== identity.binding_epoch);
  addReason(reasons, 'execution_binding_occupancy_inactive', !request.canonical_state.occupancy_active);
  addReason(reasons, 'execution_binding_execution_mismatch', request.execution_id !== binding.execution.execution_id);
  addReason(reasons, 'execution_binding_subrun_mismatch', request.subrun_id !== binding.execution.subrun_id);
  addReason(reasons, 'execution_binding_task_mismatch', request.task_id !== binding.task.task_id);
  addReason(reasons, 'execution_binding_profile_mismatch', request.profile_id !== binding.profile_id);
  addReason(reasons, 'execution_binding_scope_mismatch', request.scope_ref !== binding.scope_ref);
  addReason(reasons, 'execution_binding_capability_forbidden', binding.capabilities.forbidden.includes(request.capability));
  addReason(reasons, 'execution_binding_capability_requires_external_gate', binding.capabilities.gated.includes(request.capability));
  addReason(reasons, 'execution_binding_capability_not_allowed', !binding.capabilities.allowed.includes(request.capability));
  addReason(reasons, 'execution_binding_capability_boundary_mismatch', !binding.context.capability_boundary.includes(request.capability));
  addReason(reasons, 'execution_binding_context_mismatch', request.context_ref !== binding.context.context_ref);
  addReason(reasons, 'execution_binding_context_hash_mismatch', request.context_hash !== binding.context.canonical_hash);
  addReason(reasons, 'execution_binding_requested_output_mismatch', request.requested_output_ref !== binding.context.requested_output_ref);
  return {
    schema: 'execution-binding-evaluation.v0',
    binding_ref: binding.binding_id,
    verdict: reasons.length === 0 ? 'legitimate' : 'blocked',
    reasons,
    authority_granted: false,
    point_of_effect_checked: true,
  };
}

export function occupancySlotIndicator(seatId: string, occupancyId: string): string {
  return `slot:${sha256Hex(canonicalJson({ seat_id: seatId, occupancy_id: occupancyId })).slice(0, 16)}`;
}

export function evaluateExecutionIdentityTransition(input: ExecutionIdentityTransitionInput): ExecutionIdentityTransition {
  let candidate: ExecutionIdentity;
  try {
    candidate = parseExecutionIdentity(input.candidate);
  } catch {
    return {
      schema: 'execution-identity-transition.v0',
      verdict: 'blocked',
      reasons: ['session_binding_identity_invalid'],
      occupancy_slot: null,
      next: input.current,
      authority_granted: false,
    };
  }
  const reasons: ExecutionIdentityRefusal[] = [];
  addReason(reasons, 'session_binding_canonical_seat_mismatch', candidate.seat_id !== input.policy.canonical_seat_id);
  addReason(reasons, 'session_binding_occupancy_not_permitted', !input.policy.permitted_occupancy_ids.includes(candidate.occupancy_id));
  const sameLineage = input.current.find((item) => item.identity.seat_id === candidate.seat_id && item.identity.occupancy_id === candidate.occupancy_id);
  const activeSiblings = input.current.filter((item) => item.status === 'active' && item.identity.seat_id === candidate.seat_id && item.identity.occupancy_id !== candidate.occupancy_id);
  if (sameLineage) {
    addReason(reasons, 'session_binding_duplicate_occupancy', sameLineage.status === 'active' && candidate.binding_epoch === sameLineage.identity.binding_epoch);
    addReason(reasons, 'session_binding_epoch_stale', candidate.binding_epoch !== sameLineage.identity.binding_epoch + 1);
  } else {
    addReason(reasons, 'session_binding_epoch_stale', candidate.binding_epoch !== 1);
  }
  addReason(reasons, 'session_binding_occupancy_not_permitted', !input.policy.allow_multiple_occupancies && activeSiblings.length > 0);
  if (reasons.length > 0) {
    return {
      schema: 'execution-identity-transition.v0',
      verdict: 'blocked',
      reasons,
      occupancy_slot: occupancySlotIndicator(candidate.seat_id, candidate.occupancy_id),
      next: input.current,
      authority_granted: false,
    };
  }
  const next = input.current
    .filter((item) => !(item.identity.seat_id === candidate.seat_id && item.identity.occupancy_id === candidate.occupancy_id))
    .concat({ identity: candidate, status: 'active' });
  return {
    schema: 'execution-identity-transition.v0',
    verdict: 'legitimate',
    reasons: [],
    occupancy_slot: occupancySlotIndicator(candidate.seat_id, candidate.occupancy_id),
    next,
    authority_granted: false,
  };
}

export function parseExecutionTerminalReceipt(value: unknown): ExecutionTerminalReceipt {
  const record = asRecord(value, 'execution terminal receipt');
  if (record.schema !== EXECUTION_TERMINAL_RECEIPT_SCHEMA) throw new Error(`schema must be ${EXECUTION_TERMINAL_RECEIPT_SCHEMA}`);
  const outcome = asString(record, 'outcome');
  if (!['success', 'partial', 'blocked', 'cancelled'].includes(outcome)) throw new Error('outcome is invalid');
  return {
    schema: EXECUTION_TERMINAL_RECEIPT_SCHEMA,
    receipt_id: asString(record, 'receipt_id'),
    binding_ref: asString(record, 'binding_ref'),
    lease_ref: asString(record, 'lease_ref'),
    parent_seat_id: asString(record, 'parent_seat_id'),
    execution_id: asString(record, 'execution_id'),
    subrun_id: asString(record, 'subrun_id'),
    task_id: asString(record, 'task_id'),
    profile_id: asString(record, 'profile_id'),
    context_ref: asString(record, 'context_ref'),
    context_hash: asHash(record, 'context_hash'),
    requested_output_ref: asString(record, 'requested_output_ref'),
    terminal_sequence: asPositiveInteger(record, 'terminal_sequence'),
    outcome: outcome as ExecutionTerminalReceipt['outcome'],
    evidence_refs: asStringArray(record, 'evidence_refs'),
    parent_acceptance_required: asTrue(record, 'parent_acceptance_required'),
    authority_granted: asFalse(record, 'authority_granted'),
  };
}

export function terminalReceiptHash(value: unknown): string {
  return canonicalContextHash(parseExecutionTerminalReceipt(value) as unknown as JsonValue);
}

export function evaluateTerminalReceiptWrite(
  rawBinding: unknown,
  rawReceipt: unknown,
  state: TerminalReceiptState,
  expectedTerminalVersion: number,
): TerminalReceiptWriteEvaluation {
  let binding: ExecutionBinding;
  let receipt: ExecutionTerminalReceipt;
  try {
    binding = parseExecutionBinding(rawBinding);
    receipt = parseExecutionTerminalReceipt(rawReceipt);
  } catch {
    return {
      schema: 'terminal-receipt-write-evaluation.v0',
      verdict: 'blocked',
      reasons: ['terminal_receipt_invalid'],
      receipt_hash: null,
      next_terminal_version: state.terminal_version,
      authority_granted: false,
    };
  }
  const reasons: TerminalReceiptRefusal[] = [];
  addReason(reasons, 'terminal_receipt_binding_mismatch', receipt.binding_ref !== binding.binding_id || receipt.lease_ref !== binding.lease_ref || receipt.parent_seat_id !== binding.parent_seat_id);
  addReason(reasons, 'terminal_receipt_execution_mismatch', receipt.execution_id !== binding.execution.execution_id || receipt.subrun_id !== binding.execution.subrun_id);
  addReason(reasons, 'terminal_receipt_task_mismatch', receipt.task_id !== binding.task.task_id);
  addReason(reasons, 'terminal_receipt_profile_mismatch', receipt.profile_id !== binding.profile_id);
  addReason(reasons, 'terminal_receipt_context_mismatch', receipt.context_ref !== binding.context.context_ref || receipt.context_hash !== binding.context.canonical_hash);
  addReason(reasons, 'terminal_receipt_requested_output_mismatch', receipt.requested_output_ref !== binding.context.requested_output_ref);
  const receiptHash = terminalReceiptHash(receipt);
  if (state.existing_receipt) {
    const existingHash = terminalReceiptHash(state.existing_receipt);
    if (reasons.length === 0 && existingHash === receiptHash && state.existing_receipt.receipt_id === receipt.receipt_id) {
      return {
        schema: 'terminal-receipt-write-evaluation.v0',
        verdict: 'idempotent',
        reasons: ['terminal_receipt_duplicate'],
        receipt_hash: receiptHash,
        next_terminal_version: state.terminal_version,
        authority_granted: false,
      };
    }
    addReason(reasons, 'terminal_receipt_already_exists', true);
  }
  addReason(reasons, 'terminal_receipt_concurrent_write', expectedTerminalVersion !== state.terminal_version || receipt.terminal_sequence !== state.terminal_version + 1);
  return {
    schema: 'terminal-receipt-write-evaluation.v0',
    verdict: reasons.length === 0 ? 'append' : 'blocked',
    reasons,
    receipt_hash: receiptHash,
    next_terminal_version: reasons.length === 0 ? state.terminal_version + 1 : state.terminal_version,
    authority_granted: false,
  };
}

function parseParentAcceptance(value: unknown): ParentAcceptance {
  const record = asRecord(value, 'parent acceptance');
  if (record.schema !== PARENT_ACCEPTANCE_SCHEMA) throw new Error(`schema must be ${PARENT_ACCEPTANCE_SCHEMA}`);
  return {
    schema: PARENT_ACCEPTANCE_SCHEMA,
    acceptance_id: asString(record, 'acceptance_id'),
    receipt_ref: asString(record, 'receipt_ref'),
    receipt_hash: asHash(record, 'receipt_hash'),
    accepted_by_seat_id: asString(record, 'accepted_by_seat_id'),
    accepted_at: asIso(record, 'accepted_at'),
    authority_granted: asFalse(record, 'authority_granted'),
  };
}

export function evaluateParentAcceptance(rawReceipt: unknown, rawAcceptance: unknown): ParentAcceptanceEvaluation {
  let receipt: ExecutionTerminalReceipt;
  let acceptance: ParentAcceptance;
  try {
    receipt = parseExecutionTerminalReceipt(rawReceipt);
    acceptance = parseParentAcceptance(rawAcceptance);
  } catch {
    return {
      schema: 'parent-acceptance-evaluation.v0',
      verdict: 'blocked',
      reasons: ['parent_acceptance_invalid'],
      canonical_bridge_allowed: false,
      authority_granted: false,
    };
  }
  const reasons: ParentAcceptanceRefusal[] = [];
  addReason(reasons, 'parent_acceptance_receipt_mismatch', acceptance.receipt_ref !== receipt.receipt_id);
  addReason(reasons, 'parent_acceptance_hash_mismatch', acceptance.receipt_hash !== terminalReceiptHash(receipt));
  addReason(reasons, 'parent_acceptance_parent_mismatch', acceptance.accepted_by_seat_id !== receipt.parent_seat_id);
  return {
    schema: 'parent-acceptance-evaluation.v0',
    verdict: reasons.length === 0 ? 'accepted' : 'blocked',
    reasons,
    canonical_bridge_allowed: reasons.length === 0,
    authority_granted: false,
  };
}
