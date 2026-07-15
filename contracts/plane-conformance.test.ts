import { describe, expect, test } from 'bun:test';
import {
  evaluateAuthorityLeaseAction,
  HuddleCardV1Schema,
  PortableExitReceiptV1Schema,
  buildHuddleBoardV1,
  stableHuddleBoardFingerprint,
} from '@etiquekit/core';
import {
  type PlaneConformanceEvidenceV0,
  localPlaneProfileV0Schema,
  planeConformanceEvidenceV0Schema,
  remotePlaneProfileV0Schema,
  runPlaneConformance,
  runPlaneContractVector,
  sharedPlaneProfileV0Schema,
  validateSupportedDraft202012Schema,
} from '@etiquekit/core/conformance';
import sharedValid from '../packages/core/src/contracts/vectors/shared-plane.valid.json';
import localValid from '../packages/core/src/contracts/vectors/local-plane.valid.json';
import localInvalid from '../packages/core/src/contracts/vectors/local-plane-missing-worktree.invalid.json';
import remoteValid from '../packages/core/src/contracts/vectors/remote-plane.schema-only.valid.json';
import remoteInvalid from '../packages/core/src/contracts/vectors/remote-plane-missing-hard-stop.invalid.json';

const validationResults = {
  diff_within_allowed_writes: true,
  validation_commands_green: true,
  receipt_written: true,
};

function requireTrue(value: boolean, label: string): true {
  if (!value) throw new Error(`expected true: ${label}`);
  return true;
}

function authorityLease(patch: Record<string, unknown> = {}) {
  return {
    schema: 'authority_lease.v0',
    lease_id: 'lease:etq-local:conformance',
    issued_at: '2026-07-15T00:00:00.000Z',
    expires_at: '2026-07-16T00:00:00.000Z',
    issued_by: { principal: 'operator', authority_source: 'human_gate' },
    issued_to: { seat_id: 'impl-seat', operator_principal: 'developer' },
    scope: { repo_ref: 'repo:fixture', workflow: 'CONFORMANCE', task_classes: ['test'] },
    allowed_tools: ['edit_allowed_files', 'run_validation', 'write_receipt'],
    gated_tools: ['merge'],
    forbidden_tools: ['sign_release', 'extend_own_lease', 'subdelegate_authority'],
    validation_envelope: { required: ['diff_within_allowed_writes', 'validation_commands_green', 'receipt_written'] },
    revocation: { canonical_revocation_ref: null },
    authority_flags: {
      can_mint_authority: false,
      can_extend_own_lease: false,
      can_subdelegate: false,
      can_auto_merge_in_v0: false,
    },
    ...patch,
  };
}

function huddleCard() {
  return {
    schema_version: 'huddle-card.v1',
    repo: 'fixture',
    lane: 'CONF-001',
    task_id: 'CONF-001-A',
    mode: 'implementation',
    status: 'ready',
    startup_docs: ['README.md'],
    allowed_writes: ['src/**'],
    forbidden_sources: ['chat transcripts'],
    validation: ['bun test'],
    stop_conditions: ['write boundary exceeded'],
    expected_return: ['receipt'],
    current_owner: 'impl-seat',
    next_owner: 'review-seat',
    expires_or_refresh_after: '2026-07-16T00:00:00.000Z',
  } as const;
}

function portableReceipt() {
  return {
    schema_version: 'exit-receipt.v1',
    receipt_id: 'receipt-CONF-001-A',
    work_id: 'CONF-001-A',
    outcome: 'success',
    changed_files: ['src/example.ts'],
    validation: ['bun test -> pass'],
    evidence_refs: ['commit:abc123'],
    stop_conditions: ['none fired'],
    deferred_work: [],
    next_owner: 'review-seat',
  } as const;
}

describe('plane contract JSON Schemas', () => {
  test('all canonical schemas pass the supported Draft 2020-12 meta-schema gate', () => {
    for (const schema of [
      sharedPlaneProfileV0Schema,
      localPlaneProfileV0Schema,
      remotePlaneProfileV0Schema,
      planeConformanceEvidenceV0Schema,
    ]) {
      expect(validateSupportedDraft202012Schema(schema)).toEqual([]);
    }
  });

  test('accepts positive vectors and rejects missing local or remote capabilities', () => {
    for (const vector of [sharedValid, localValid, remoteValid]) {
      expect(runPlaneContractVector(vector).valid).toBe(true);
    }
    expect(runPlaneContractVector(localInvalid).issues.some((issue) => issue.path === '$.local.worktrees')).toBe(true);
    expect(runPlaneContractVector(remoteInvalid).issues.some((issue) => issue.path === '$.remote.hard_stop')).toBe(true);
  });
});

describe('our local plane shared-invariant conformance', () => {
  test('derives passing evidence from the shipped envelope, lease, receipt, refusal, and projection surfaces', () => {
    const validCard = HuddleCardV1Schema.parse(huddleCard());
    let admissionRefusal = '';
    try {
      HuddleCardV1Schema.parse({ ...huddleCard(), allowed_writes: [] });
    } catch (error) {
      admissionRefusal = error instanceof Error ? error.message : String(error);
    }

    const active = evaluateAuthorityLeaseAction(authorityLease(), {
      capability: 'edit_allowed_files',
      validation_results: validationResults,
      canonical_state: { at: '2026-07-15T12:00:00.000Z' },
      evidence_ref: 'receipt:CONF-001-A',
    });
    const expired = evaluateAuthorityLeaseAction(authorityLease(), {
      capability: 'edit_allowed_files',
      validation_results: validationResults,
      canonical_state: { at: '2026-07-17T00:00:00.000Z' },
    });
    const revoked = evaluateAuthorityLeaseAction(authorityLease({
      revocation: { canonical_revocation_ref: 'revocation:CONF-001-A' },
    }), {
      capability: 'edit_allowed_files',
      validation_results: validationResults,
      canonical_state: { at: '2026-07-15T12:00:00.000Z' },
    });
    const pointOfEffect = evaluateAuthorityLeaseAction(authorityLease(), {
      capability: 'edit_allowed_files',
      validation_results: validationResults,
      canonical_state: {
        at: '2026-07-15T12:00:00.000Z',
        revoked_lease_ids: ['lease:etq-local:conformance'],
      },
    });

    const receipt = PortableExitReceiptV1Schema.parse(portableReceipt());
    let receiptRefusal = '';
    try {
      PortableExitReceiptV1Schema.parse({ ...portableReceipt(), evidence_refs: [] });
    } catch (error) {
      receiptRefusal = error instanceof Error ? error.message : String(error);
    }

    const board = buildHuddleBoardV1({
      cards: [{ card: validCard, ref: 'card:CONF-001-A' }],
      generated_at: '2026-07-15T12:00:00.000Z',
    });
    const firstFingerprint = stableHuddleBoardFingerprint(board);
    const secondFingerprint = stableHuddleBoardFingerprint(board);

    const evidence: PlaneConformanceEvidenceV0 = {
      schema_version: 'plane-conformance-evidence.v0',
      plane_id: 'etq-local',
      observations: {
        admission: {
          valid_envelope_accepted: requireTrue(Boolean(validCard.task_id), 'valid envelope accepted'),
          invalid_envelope_refused: requireTrue(admissionRefusal.length > 0, 'invalid envelope refused'),
          refusal_reason: 'implementation_card_requires_allowed_writes',
        },
        leases: {
          active_allowed: requireTrue(active.verdict === 'legitimate', 'active lease allowed'),
          expired_refused: requireTrue(expired.reasons.includes('lease_expired'), 'expired lease refused'),
          revoked_refused: requireTrue(revoked.reasons.includes('lease_revoked'), 'revoked lease refused'),
          point_of_effect_refused: requireTrue(
            pointOfEffect.reasons.includes('lease_revoked_at_point_of_effect'),
            'point-of-effect revocation refused',
          ),
        },
        receipts: {
          valid_receipt_accepted: requireTrue(Boolean(receipt.receipt_id), 'valid receipt accepted'),
          missing_evidence_refused: requireTrue(receiptRefusal.length > 0, 'missing evidence refused'),
        },
        refusals: {
          typed_reasons: [
            'implementation_card_requires_allowed_writes',
            'lease_expired',
            'receipt_requires_evidence_refs',
          ],
        },
        idempotency: {
          repeat_outcome: firstFingerprint === secondFingerprint ? 'same_result' : 'typed_refusal',
          silent_duplicate: false,
        },
        authority: {
          can_authorize: false,
          can_merge: false,
          can_close: false,
          can_promote: false,
        },
      },
    } as const;

    const report = runPlaneConformance(localValid.candidate, evidence, 'local');
    expect(report.verdict).toBe('pass');
    expect(report.checks).toHaveLength(6);
    expect(report.checks.every((check) => check.status === 'pass')).toBe(true);
    expect(report.checks.find((check) => check.id === 'leases')).toEqual({
      id: 'leases',
      status: 'pass',
      evidence_path: '$.observations.leases',
    });
    expect(report.authority_boundary).toEqual({
      can_authorize: false,
      can_grant: false,
      can_merge: false,
      can_close: false,
      can_promote: false,
    });
  });

  test('fails closed when evidence is self-inconsistent', () => {
    const report = runPlaneConformance(localValid.candidate, {
      schema_version: 'plane-conformance-evidence.v0',
      plane_id: 'another-plane',
      observations: {},
    }, 'local');

    expect(report.verdict).toBe('fail');
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.authority_boundary.can_authorize).toBe(false);
  });
});
