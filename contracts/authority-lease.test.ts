import { describe, expect, test } from 'bun:test';
import { evaluateAuthorityLeaseAction, parseAuthorityLease } from '@etiquekit/core';

function lease(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: 'authority_lease.v0',
    lease_id: 'lease:v4-refactor-shop:example',
    issued_at: '2026-06-29T00:00:00.000Z',
    expires_at: '2026-06-29T23:59:59.000Z',
    issued_by: {
      principal: 'workspace-owner',
      authority_source: 'human_gate',
    },
    issued_to: {
      seat_id: 'impl-seat',
      operator_principal: 'developer-1',
    },
    scope: {
      repo_ref: 'repo:v4',
      workflow: 'V4-REFACTOR-SHOP',
      task_classes: ['refactor', 'test_fix', 'evidence_update'],
    },
    allowed_tools: ['edit_allowed_files', 'run_validation', 'write_receipt', 'open_candidate'],
    gated_tools: ['merge', 'protected_branch_push', 'release'],
    forbidden_tools: ['rotate_secret', 'sign_release', 'extend_own_lease', 'subdelegate_authority', 'mutate_policy'],
    validation_envelope: {
      required: ['diff_within_allowed_writes', 'validation_commands_green', 'receipt_written'],
    },
    revocation: {
      canonical_revocation_ref: null,
    },
    authority_flags: {
      can_mint_authority: false,
      can_extend_own_lease: false,
      can_subdelegate: false,
      can_auto_merge_in_v0: false,
    },
    ...patch,
  };
}

const passingValidation = {
  diff_within_allowed_writes: true,
  validation_commands_green: true,
  receipt_written: true,
};

describe('authority_lease.v0', () => {
  test('parses narrow leases with authority flags fixed false', () => {
    const parsed = parseAuthorityLease(lease());
    expect(parsed.schema).toBe('authority_lease.v0');
    expect(parsed.authority_flags.can_mint_authority).toBe(false);
    expect(parsed.authority_flags.can_extend_own_lease).toBe(false);
    expect(parsed.authority_flags.can_subdelegate).toBe(false);
    expect(parsed.authority_flags.can_auto_merge_in_v0).toBe(false);
  });

  test('public package exports the portable parser and point-of-effect evaluator', () => {
    const parsed = parseAuthorityLease(lease());
    const input = {
      capability: 'edit_allowed_files',
      validation_results: passingValidation,
      canonical_state: { at: '2026-06-29T12:00:00.000Z' },
      evidence_ref: 'receipt:v4-refactor-001',
    };
    const result = evaluateAuthorityLeaseAction(parsed, input);

    expect(result.verdict).toBe('legitimate');
    expect(result.capability_used).toBe('edit_allowed_files');
    expect(result.validation.missing_or_failed).toEqual([]);
  });

  test('rejects omitted or true authority flags', () => {
    const missing = lease({
      authority_flags: {
        can_mint_authority: false,
        can_extend_own_lease: false,
        can_subdelegate: false,
      },
    });
    const trueFlag = lease({
      authority_flags: {
        can_mint_authority: false,
        can_extend_own_lease: true,
        can_subdelegate: false,
        can_auto_merge_in_v0: false,
      },
    });
    expect(() => parseAuthorityLease(missing)).toThrow('can_auto_merge_in_v0 must be false');
    expect(() => parseAuthorityLease(trueFlag)).toThrow('can_extend_own_lease must be false');
  });

  test('blocks expired and revoked leases in pure point-of-effect validation', () => {
    const expired = evaluateAuthorityLeaseAction(lease(), {
      capability: 'edit_allowed_files',
      validation_results: passingValidation,
      canonical_state: { at: '2026-06-30T00:00:00.000Z' },
    });
    const revoked = evaluateAuthorityLeaseAction(lease({
      revocation: { canonical_revocation_ref: 'revocation:lease:v4-refactor-shop:example' },
    }), {
      capability: 'edit_allowed_files',
      validation_results: passingValidation,
      canonical_state: { at: '2026-06-29T12:00:00.000Z' },
    });
    expect(expired.verdict).toBe('blocked');
    expect(expired.reasons).toContain('lease_expired');
    expect(revoked.verdict).toBe('blocked');
    expect(revoked.reasons).toContain('lease_revoked');
  });

  test('requires capability plus validation to make a leased act legitimate', () => {
    const legitimate = evaluateAuthorityLeaseAction(lease(), {
      capability: 'edit_allowed_files',
      validation_results: passingValidation,
      canonical_state: { at: '2026-06-29T12:00:00.000Z' },
      evidence_ref: 'receipt:v4-refactor-001',
    });
    const missingValidation = evaluateAuthorityLeaseAction(lease(), {
      capability: 'edit_allowed_files',
      validation_results: { ...passingValidation, receipt_written: false },
      canonical_state: { at: '2026-06-29T12:00:00.000Z' },
    });
    const forbiddenCapability = evaluateAuthorityLeaseAction(lease(), {
      capability: 'sign_release',
      validation_results: passingValidation,
      canonical_state: { at: '2026-06-29T12:00:00.000Z' },
    });
    expect(legitimate.verdict).toBe('legitimate');
    expect(legitimate.authority_boundary.minted_authority).toBe(false);
    expect(legitimate.authority_boundary.point_of_effect_checked).toBe(true);
    expect(missingValidation.verdict).toBe('blocked');
    expect(missingValidation.reasons).toContain('validation_envelope_failed');
    expect(forbiddenCapability.verdict).toBe('blocked');
    expect(forbiddenCapability.reasons).toContain('capability_forbidden');
  });

  test('point-of-effect canonical state overrides stale local lease cache', () => {
    const result = evaluateAuthorityLeaseAction(lease(), {
      capability: 'edit_allowed_files',
      validation_results: passingValidation,
      canonical_state: {
        at: '2026-06-29T12:00:00.000Z',
        revoked_lease_ids: ['lease:v4-refactor-shop:example'],
      },
    });
    expect(result.verdict).toBe('blocked');
    expect(result.reasons).toContain('lease_revoked_at_point_of_effect');
  });

  test('gated tools do not auto-merge in V0', () => {
    const result = evaluateAuthorityLeaseAction(lease(), {
      capability: 'merge',
      validation_results: passingValidation,
      canonical_state: { at: '2026-06-29T12:00:00.000Z' },
    });
    expect(result.verdict).toBe('blocked');
    expect(result.reasons).toContain('capability_requires_external_gate');
    expect(result.authority_boundary.can_auto_merge_in_v0).toBe(false);
  });

  test('the public boundary doc states that core is not an authority grant', () => {
    const result = evaluateAuthorityLeaseAction(lease(), {
      capability: 'merge',
      validation_results: passingValidation,
      canonical_state: { at: '2026-06-29T12:00:00.000Z' },
    });

    expect(result.verdict).toBe('blocked');
    expect(result.authority_boundary.minted_authority).toBe(false);
    expect(result.authority_boundary.telemetry_is_audit_log).toBe(false);
    expect(result.authority_boundary.can_auto_merge_in_v0).toBe(false);
  });
});
