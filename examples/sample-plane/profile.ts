// The sample plane's CANDIDATE capability profile — its self-description against
// the shared-invariant contract (shared-plane-profile.v0). This is a plain data
// object; core's conformance kit validates it. The plane does not self-grant:
// declaring conformance is not authorizing anything.

export const SAMPLE_PLANE_ID = 'etq-sample';

export const sampleSharedProfile = {
  schema_version: 'plane-contract.v0',
  plane_id: SAMPLE_PLANE_ID,
  profile: 'shared',
  shared: {
    admission: {
      task_envelope_required: true,
      invalid_envelope_outcome: 'typed_refusal',
    },
    leases: {
      point_of_effect_validation: true,
      expired_outcome: 'typed_refusal',
      revoked_outcome: 'typed_refusal',
    },
    receipts: {
      terminal_receipt_required: true,
      evidence_refs_required: true,
    },
    refusals: {
      typed: true,
      machine_readable_reason: true,
    },
    idempotency: {
      retry_semantics_declared: true,
      silent_duplicate_success_allowed: false,
      duplicate_effects_detectable: true,
    },
    authority: {
      plane_can_self_grant: false,
      conformance_can_authorize: false,
      receipt_can_authorize: false,
    },
  },
} as const;
