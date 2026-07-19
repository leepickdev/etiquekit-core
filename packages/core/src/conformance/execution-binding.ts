import {
  canonicalContextHash,
  evaluateExecutionBinding,
  evaluateExecutionIdentityTransition,
  evaluateParentAcceptance,
  evaluateTerminalReceiptWrite,
  terminalReceiptHash,
  type ExecutionBinding,
  type ExecutionBindingRefusal,
  type ExecutionBindingRequest,
  type ExecutionIdentity,
  type ExecutionIdentityRefusal,
  type ExecutionTerminalReceipt,
  type TerminalReceiptRefusal,
} from '../execution';

const contextHash = canonicalContextHash({ task: 'TASK-1', prompt: 'bounded context' });

export const executionBindingConformanceFixture = {
  binding: {
    schema: 'execution_binding.v0',
    binding_id: 'binding:fixture:1',
    lease_ref: 'lease:fixture:1',
    issued_at: '2026-07-19T00:00:00.000Z',
    expires_at: '2026-07-20T00:00:00.000Z',
    parent_seat_id: 'v3-codex-team',
    execution_identity: {
      seat_id: 'v3-codex-team',
      occupancy_id: 'codex-primary',
      session_id: 'session-1',
      runner_binding_actual: {
        runtime: 'codex-cli-local',
        provider: 'openai',
        model: 'gpt-5.6',
        profile: 'xhigh',
      },
      binding_epoch: 4,
    },
    execution: {
      execution_id: 'execution-1',
      subrun_id: 'subrun-1',
      parent_execution_id: null,
    },
    task: { task_id: 'TASK-1', task_ref: 'task:TASK-1' },
    profile_id: 'profile:implementation',
    scope_ref: 'scope:src-only',
    capabilities: {
      allowed: ['edit_allowed_files', 'run_validation'],
      gated: ['merge'],
      forbidden: ['publish'],
    },
    context: {
      context_ref: 'context:TASK-1',
      canonical_hash: contextHash,
      privacy_boundary: ['no_secrets', 'no_raw_chat'],
      capability_boundary: ['edit_allowed_files', 'run_validation'],
      requested_output_ref: 'output:TASK-1:return',
    },
    revocation: { canonical_revocation_ref: null },
    authority_granted: false,
  } satisfies ExecutionBinding,
  request: {
    parent_seat_id: 'v3-codex-team',
    occupancy_id: 'codex-primary',
    session_id: 'session-1',
    runner_binding_actual: {
      runtime: 'codex-cli-local',
      provider: 'openai',
      model: 'gpt-5.6',
      profile: 'xhigh',
    },
    binding_epoch: 4,
    execution_id: 'execution-1',
    subrun_id: 'subrun-1',
    task_id: 'TASK-1',
    profile_id: 'profile:implementation',
    scope_ref: 'scope:src-only',
    capability: 'edit_allowed_files',
    context_ref: 'context:TASK-1',
    context_hash: contextHash,
    requested_output_ref: 'output:TASK-1:return',
    canonical_state: {
      at: '2026-07-19T12:00:00.000Z',
      revoked_binding_ids: [],
      occupancy_active: true,
      current_binding_epoch: 4,
    },
  } satisfies ExecutionBindingRequest,
  receipt: {
    schema: 'execution_terminal_receipt.v0',
    receipt_id: 'receipt:execution-1',
    binding_ref: 'binding:fixture:1',
    lease_ref: 'lease:fixture:1',
    parent_seat_id: 'v3-codex-team',
    execution_id: 'execution-1',
    subrun_id: 'subrun-1',
    task_id: 'TASK-1',
    profile_id: 'profile:implementation',
    context_ref: 'context:TASK-1',
    context_hash: contextHash,
    requested_output_ref: 'output:TASK-1:return',
    terminal_sequence: 1,
    outcome: 'success',
    evidence_refs: ['commit:abc123'],
    parent_acceptance_required: true,
    authority_granted: false,
  } satisfies ExecutionTerminalReceipt,
} as const;

export interface ExecutionConformanceVectorResult {
  id: 'impersonation' | 'expiry' | 'revocation' | 'duplicate_receipt' | 'profile_mismatch' | 'task_mismatch' | 'reset' | 'concurrent_append';
  passed: boolean;
  expected_reason: ExecutionBindingRefusal | TerminalReceiptRefusal;
  actual_reasons: readonly string[];
}

function bindingVector(
  id: ExecutionConformanceVectorResult['id'],
  request: ExecutionBindingRequest,
  expected: ExecutionBindingRefusal,
  binding: ExecutionBinding = executionBindingConformanceFixture.binding,
): ExecutionConformanceVectorResult {
  const result = evaluateExecutionBinding(binding, request);
  return { id, passed: result.verdict === 'blocked' && result.reasons.includes(expected), expected_reason: expected, actual_reasons: result.reasons };
}

export function runExecutionBindingConformanceVectors(): ExecutionConformanceVectorResult[] {
  const { binding, request, receipt } = executionBindingConformanceFixture;
  const impersonation = bindingVector('impersonation', { ...request, parent_seat_id: 'v3-other-team' }, 'execution_binding_parent_mismatch');
  const expiry = bindingVector('expiry', { ...request, canonical_state: { ...request.canonical_state, at: binding.expires_at } }, 'execution_binding_expired');
  const revocation = bindingVector('revocation', { ...request, canonical_state: { ...request.canonical_state, revoked_binding_ids: [binding.binding_id] } }, 'execution_binding_revoked_at_point_of_effect');
  const profileMismatch = bindingVector('profile_mismatch', { ...request, profile_id: 'profile:review' }, 'execution_binding_profile_mismatch');
  const taskMismatch = bindingVector('task_mismatch', { ...request, task_id: 'TASK-2' }, 'execution_binding_task_mismatch');
  const reset = bindingVector('reset', { ...request, canonical_state: { ...request.canonical_state, current_binding_epoch: request.binding_epoch + 1 } }, 'execution_binding_epoch_stale');
  const duplicate = evaluateTerminalReceiptWrite(binding, receipt, { terminal_version: 1, existing_receipt: receipt }, 1);
  const duplicateReceipt: ExecutionConformanceVectorResult = {
    id: 'duplicate_receipt',
    passed: duplicate.verdict === 'idempotent' && duplicate.reasons.includes('terminal_receipt_duplicate'),
    expected_reason: 'terminal_receipt_duplicate',
    actual_reasons: duplicate.reasons,
  };
  const concurrent = evaluateTerminalReceiptWrite(binding, receipt, { terminal_version: 1, existing_receipt: null }, 0);
  const concurrentAppend: ExecutionConformanceVectorResult = {
    id: 'concurrent_append',
    passed: concurrent.verdict === 'blocked' && concurrent.reasons.includes('terminal_receipt_concurrent_write'),
    expected_reason: 'terminal_receipt_concurrent_write',
    actual_reasons: concurrent.reasons,
  };
  return [impersonation, expiry, revocation, duplicateReceipt, profileMismatch, taskMismatch, reset, concurrentAppend];
}

export interface OccupancyConformanceResult {
  id: 'first_issue' | 'duplicate_active' | 'epoch_rebind' | 'sibling_isolation' | 'unauthorized_sibling' | 'stable_slot' | 'occupancy_mismatch' | 'session_replay' | 'runner_mismatch' | 'parent_acceptance';
  passed: boolean;
  reasons: readonly ExecutionIdentityRefusal[] | readonly string[];
}

export function runExecutionOccupancyConformanceVectors(): OccupancyConformanceResult[] {
  const baseIdentity = executionBindingConformanceFixture.binding.execution_identity;
  const sibling: ExecutionIdentity = {
    ...baseIdentity,
    occupancy_id: 'codex-review',
    session_id: 'session-review',
    binding_epoch: 2,
  };
  const policy = {
    canonical_seat_id: baseIdentity.seat_id,
    permitted_occupancy_ids: [baseIdentity.occupancy_id, sibling.occupancy_id],
    allow_multiple_occupancies: true,
  };
  const first = evaluateExecutionIdentityTransition({ candidate: { ...baseIdentity, binding_epoch: 1 }, current: [], policy });
  const duplicate = evaluateExecutionIdentityTransition({ candidate: baseIdentity, current: [{ identity: baseIdentity, status: 'active' }], policy });
  const rebound: ExecutionIdentity = { ...baseIdentity, session_id: 'session-2', binding_epoch: baseIdentity.binding_epoch + 1 };
  const rebind = evaluateExecutionIdentityTransition({
    candidate: rebound,
    current: [{ identity: baseIdentity, status: 'active' }, { identity: sibling, status: 'active' }],
    policy,
  });
  const preservedSibling = rebind.next.find((item) => item.identity.occupancy_id === sibling.occupancy_id);
  const unauthorized = evaluateExecutionIdentityTransition({
    candidate: sibling,
    current: [{ identity: baseIdentity, status: 'active' }],
    policy: { ...policy, permitted_occupancy_ids: [baseIdentity.occupancy_id], allow_multiple_occupancies: false },
  });
  const occupancyMismatch = evaluateExecutionBinding(executionBindingConformanceFixture.binding, {
    ...executionBindingConformanceFixture.request,
    occupancy_id: sibling.occupancy_id,
  });
  const sessionReplay = evaluateExecutionBinding(executionBindingConformanceFixture.binding, {
    ...executionBindingConformanceFixture.request,
    session_id: 'stale-session',
  });
  const runnerMismatch = evaluateExecutionBinding(executionBindingConformanceFixture.binding, {
    ...executionBindingConformanceFixture.request,
    runner_binding_actual: {
      ...executionBindingConformanceFixture.request.runner_binding_actual,
      model: 'different-model',
    },
  });
  const receipt = executionBindingConformanceFixture.receipt;
  const receiptHash = terminalReceiptHash(receipt);
  const acceptance = evaluateParentAcceptance(receipt, {
    schema: 'parent_acceptance.v0',
    acceptance_id: 'acceptance:1',
    receipt_ref: receipt.receipt_id,
    receipt_hash: receiptHash,
    accepted_by_seat_id: receipt.parent_seat_id,
    accepted_at: '2026-07-19T12:05:00.000Z',
    authority_granted: false,
  });
  return [
    { id: 'first_issue', passed: first.verdict === 'legitimate', reasons: first.reasons },
    { id: 'duplicate_active', passed: duplicate.verdict === 'blocked' && duplicate.reasons.includes('session_binding_duplicate_occupancy'), reasons: duplicate.reasons },
    { id: 'epoch_rebind', passed: rebind.verdict === 'legitimate' && rebind.next.some((item) => item.identity.session_id === 'session-2'), reasons: rebind.reasons },
    { id: 'sibling_isolation', passed: preservedSibling?.identity.session_id === sibling.session_id && preservedSibling.identity.binding_epoch === sibling.binding_epoch, reasons: rebind.reasons },
    { id: 'unauthorized_sibling', passed: unauthorized.verdict === 'blocked' && unauthorized.reasons.includes('session_binding_occupancy_not_permitted'), reasons: unauthorized.reasons },
    { id: 'stable_slot', passed: first.occupancy_slot !== null && first.occupancy_slot === evaluateExecutionIdentityTransition({ candidate: { ...baseIdentity, binding_epoch: 1 }, current: [], policy }).occupancy_slot, reasons: [] },
    { id: 'occupancy_mismatch', passed: occupancyMismatch.verdict === 'blocked' && occupancyMismatch.reasons.includes('execution_binding_occupancy_mismatch'), reasons: occupancyMismatch.reasons },
    { id: 'session_replay', passed: sessionReplay.verdict === 'blocked' && sessionReplay.reasons.includes('execution_binding_session_mismatch'), reasons: sessionReplay.reasons },
    { id: 'runner_mismatch', passed: runnerMismatch.verdict === 'blocked' && runnerMismatch.reasons.includes('execution_binding_runner_mismatch'), reasons: runnerMismatch.reasons },
    { id: 'parent_acceptance', passed: acceptance.verdict === 'accepted' && acceptance.canonical_bridge_allowed && !acceptance.authority_granted, reasons: acceptance.reasons },
  ];
}
