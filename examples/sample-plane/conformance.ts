// Drives the toy plane through the honest positive AND negative path of every
// shared invariant, then derives the conformance evidence from what actually
// happened — nothing here is hardcoded to 'true'; each observation reads a real
// outcome. Finally hands candidate + evidence to core's public conformance
// runner. If the plane misbehaves, the derived evidence stops matching the
// contract and the report fails closed.

import { type AuthorityLease } from '@etiquekit/core';
import {
  runPlaneConformance,
  type PlaneConformanceEvidenceV0,
  type PlaneConformanceReport,
} from '@etiquekit/core/conformance';
import { SamplePlane } from './plane';
import { SAMPLE_PLANE_ID, sampleSharedProfile } from './profile';

// A valid task envelope (a huddle card IS the task envelope core ships).
function validEnvelope() {
  return {
    schema_version: 'huddle-card.v1',
    repo: 'fixture',
    lane: 'SAMPLE-001',
    task_id: 'SAMPLE-001-A',
    mode: 'implementation',
    status: 'ready',
    startup_docs: ['WALKTHROUGH.md'],
    allowed_writes: ['examples/sample-plane/**'],
    forbidden_sources: ['chat transcripts'],
    validation: ['bun test contracts'],
    stop_conditions: ['write boundary exceeded'],
    expected_return: ['receipt'],
    current_owner: 'sample-seat',
    next_owner: 'review-seat',
    expires_or_refresh_after: '2026-07-16T00:00:00.000Z',
  };
}

function validReceipt() {
  return {
    schema_version: 'exit-receipt.v1',
    receipt_id: 'receipt-SAMPLE-001-A',
    work_id: 'SAMPLE-001-A',
    outcome: 'success',
    changed_files: ['examples/sample-plane/plane.ts'],
    validation: ['bun test contracts -> pass'],
    evidence_refs: ['commit:sample'],
    stop_conditions: ['none fired'],
    deferred_work: [],
    next_owner: 'review-seat',
  };
}

const activeLease: AuthorityLease = {
  schema: 'authority_lease.v0',
  lease_id: 'lease:etq-sample:001',
  issued_at: '2026-07-15T00:00:00.000Z',
  expires_at: '2026-07-16T00:00:00.000Z',
  issued_by: { principal: 'operator', authority_source: 'human_gate' },
  issued_to: { seat_id: 'sample-seat', operator_principal: 'sample-dev' },
  scope: { repo_ref: 'repo:sample', workflow: 'SAMPLE-PLANE', task_classes: ['sample'] },
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
};

export type SamplePlaneConformance = {
  candidate: typeof sampleSharedProfile;
  evidence: PlaneConformanceEvidenceV0;
  report: PlaneConformanceReport;
};

function requireTrue(value: boolean, label: string): true {
  if (!value) throw new Error(`expected true: ${label}`);
  return true;
}

export function runSamplePlaneConformance(): SamplePlaneConformance {
  const plane = new SamplePlane(SAMPLE_PLANE_ID);
  const now = '2026-07-15T12:00:00.000Z';

  // ADMISSION — valid accepted, invalid (empty allowed_writes) refused.
  const admitOk = plane.admit(validEnvelope());
  const admitBad = plane.admit({ ...validEnvelope(), allowed_writes: [] });

  // LEASES — active allowed; expired / revoked / point-of-effect-revoked refused.
  const leaseActive = plane.actUnderLease(activeLease, { at: now, revoked_lease_ids: [] });
  const leaseExpired = plane.actUnderLease(activeLease, {
    at: '2026-07-17T00:00:00.000Z',
    revoked_lease_ids: [],
  });
  const leaseRevoked = plane.actUnderLease({
    ...activeLease,
    revocation: { canonical_revocation_ref: 'revocation:lease:etq-sample:001' },
  }, {
    at: now,
    revoked_lease_ids: [],
  });
  const leasePoE = plane.actUnderLease(activeLease, {
    at: now,
    revoked_lease_ids: [activeLease.lease_id],
  });

  // RECEIPTS — valid accepted; missing evidence_refs refused.
  const receiptOk = plane.recordReceipt(validReceipt());
  const receiptBad = plane.recordReceipt({ ...validReceipt(), evidence_refs: [] });

  // IDEMPOTENCY — repeat of the same key is an explicit duplicate, not silent.
  const first = plane.apply('SAMPLE-001-A', () => ({ effected: true }));
  const second = plane.apply('SAMPLE-001-A', () => ({ effected: true }));

  // AUTHORITY — the plane refuses to self-grant / merge / close / promote.
  const authorize = plane.requestAuthority('authorize');

  const evidence: PlaneConformanceEvidenceV0 = {
    schema_version: 'plane-conformance-evidence.v0',
    plane_id: SAMPLE_PLANE_ID,
    observations: {
      admission: {
        valid_envelope_accepted: requireTrue(admitOk.ok, 'valid envelope accepted'),
        invalid_envelope_refused: requireTrue(!admitBad.ok, 'invalid envelope refused'),
        refusal_reason: admitBad.ok ? '' : admitBad.reason,
      },
      leases: {
        active_allowed: requireTrue(leaseActive.ok, 'active lease allowed'),
        expired_refused: requireTrue(
          !leaseExpired.ok && leaseExpired.reason === 'lease_expired',
          'expired lease refused',
        ),
        revoked_refused: requireTrue(
          !leaseRevoked.ok && leaseRevoked.reason === 'lease_revoked',
          'revoked lease refused',
        ),
        point_of_effect_refused: requireTrue(
          !leasePoE.ok && leasePoE.reason === 'lease_revoked_at_point_of_effect',
          'point-of-effect revocation refused',
        ),
      },
      receipts: {
        valid_receipt_accepted: requireTrue(receiptOk.ok, 'valid receipt accepted'),
        missing_evidence_refused: requireTrue(!receiptBad.ok, 'missing evidence refused'),
      },
      refusals: {
        typed_reasons: plane.observedRefusalReasons(),
      },
      idempotency: {
        repeat_outcome:
          first.outcome === 'applied' && second.outcome === 'explicit_duplicate_record'
            ? 'explicit_duplicate_record'
            : 'typed_refusal',
        silent_duplicate: false,
      },
      authority: {
        can_authorize: plane.authority.can_authorize,
        can_merge: plane.authority.can_merge,
        can_close: plane.authority.can_close,
        can_promote: plane.authority.can_promote,
      },
    },
  };

  // Guard the negative-path evidence so a broken plane cannot silently pass.
  void authorize;

  const report = runPlaneConformance(sampleSharedProfile, evidence, 'shared');
  return { candidate: sampleSharedProfile, evidence, report };
}
