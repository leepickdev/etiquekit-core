import { describe, expect, test } from 'bun:test';
import {
  executionBindingConformanceFixture,
  runExecutionBindingConformanceVectors,
  runExecutionOccupancyConformanceVectors,
} from '@etiquekit/core/conformance';
import {
  canonicalContextHash,
  canonicalJson,
  evaluateExecutionBinding,
  evaluateTerminalReceiptWrite,
} from '@etiquekit/core/execution';
import { evaluateAuthorityLeaseAction } from '@etiquekit/core';

describe('execution_binding.v0 conformance', () => {
  test('executes all eight required negative vectors', () => {
    const results = runExecutionBindingConformanceVectors();
    expect(results.map((result) => result.id)).toEqual([
      'impersonation',
      'expiry',
      'revocation',
      'duplicate_receipt',
      'profile_mismatch',
      'task_mismatch',
      'reset',
      'concurrent_append',
    ]);
    expect(results.every((result) => result.passed), JSON.stringify(results)).toBe(true);
  });

  test('keeps canonical context hashing deterministic and order independent', () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(canonicalContextHash({ b: 2, a: 1 })).toBe(canonicalContextHash({ a: 1, b: 2 }));
    expect(canonicalContextHash({ a: 1 })).toBe('sha256:015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862');
  });

  test('admits the exact bound request and refuses exact expiry', () => {
    const { binding, request } = executionBindingConformanceFixture;
    expect(evaluateExecutionBinding(binding, request)).toMatchObject({ verdict: 'legitimate', reasons: [] });
    expect(evaluateExecutionBinding(binding, {
      ...request,
      canonical_state: { ...request.canonical_state, at: binding.expires_at },
    }).reasons).toContain('execution_binding_expired');
  });

  test('permits one terminal append and makes an identical retry explicit', () => {
    const { binding, receipt } = executionBindingConformanceFixture;
    const first = evaluateTerminalReceiptWrite(binding, receipt, { terminal_version: 0, existing_receipt: null }, 0);
    const repeated = evaluateTerminalReceiptWrite(binding, receipt, { terminal_version: 1, existing_receipt: receipt }, 1);
    expect(first).toMatchObject({ verdict: 'append', next_terminal_version: 1 });
    expect(repeated).toMatchObject({ verdict: 'idempotent', reasons: ['terminal_receipt_duplicate'], next_terminal_version: 1 });
  });

  test('treats the authority lease expiry instant as expired', () => {
    const { binding } = executionBindingConformanceFixture;
    const lease = {
      schema: 'authority_lease.v0',
      lease_id: binding.lease_ref,
      issued_at: binding.issued_at,
      expires_at: binding.expires_at,
      issued_by: { principal: 'zach', authority_source: 'human_gate' },
      issued_to: { seat_id: binding.parent_seat_id },
      scope: { task_classes: ['implementation'] },
      allowed_tools: ['edit_allowed_files'],
      gated_tools: ['merge'],
      forbidden_tools: ['publish'],
      validation_envelope: { required: ['tests_green'] },
      revocation: { canonical_revocation_ref: null },
      authority_flags: {
        can_mint_authority: false,
        can_extend_own_lease: false,
        can_subdelegate: false,
        can_auto_merge_in_v0: false,
      },
    };
    const result = evaluateAuthorityLeaseAction(lease, {
      capability: 'edit_allowed_files',
      validation_results: { tests_green: true },
      canonical_state: { at: binding.expires_at },
    });
    expect(result).toMatchObject({ verdict: 'blocked' });
    expect(result.reasons).toContain('lease_expired');
  });
});

describe('execution occupancy extension conformance', () => {
  test('covers lineage epochs, duplicate-active refusal, sibling isolation, screening, and parent acceptance', () => {
    const results = runExecutionOccupancyConformanceVectors();
    expect(results.every((result) => result.passed), JSON.stringify(results)).toBe(true);
  });
});
