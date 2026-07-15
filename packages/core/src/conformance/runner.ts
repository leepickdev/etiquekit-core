import sharedProfileSchema from '../contracts/shared-plane-profile.v0.schema.json';
import localProfileSchema from '../contracts/local-plane-profile.v0.schema.json';
import remoteProfileSchema from '../contracts/remote-plane-profile.v0.schema.json';
import evidenceSchema from '../contracts/plane-conformance-evidence.v0.schema.json';
import {
  validateJsonSchemaValue,
  type SchemaIssue,
} from './schema-validator';

export type PlaneProfile = 'shared' | 'local' | 'remote';

export type PlaneContractValidation = {
  valid: boolean;
  profile: PlaneProfile;
  issues: SchemaIssue[];
};

export type PlaneConformanceCheck = {
  id: 'admission' | 'leases' | 'receipts' | 'refusals' | 'idempotency' | 'authority';
  status: 'pass' | 'fail';
  evidence_path: string;
};

export type PlaneConformanceEvidenceV0 = {
  schema_version: 'plane-conformance-evidence.v0';
  plane_id: string;
  observations: {
    admission: {
      valid_envelope_accepted: true;
      invalid_envelope_refused: true;
      refusal_reason: string;
    };
    leases: {
      active_allowed: true;
      expired_refused: true;
      revoked_refused: true;
      point_of_effect_refused: true;
    };
    receipts: {
      valid_receipt_accepted: true;
      missing_evidence_refused: true;
    };
    refusals: {
      typed_reasons: string[];
    };
    idempotency: {
      repeat_outcome: 'same_result' | 'typed_refusal' | 'explicit_duplicate_record';
      silent_duplicate: false;
    };
    authority: {
      can_authorize: false;
      can_merge: false;
      can_close: false;
      can_promote: false;
    };
  };
};

export type PlaneConformanceReport = {
  schema_version: 'plane-conformance-report.v0';
  plane_id: string;
  profile: PlaneProfile;
  verdict: 'pass' | 'fail';
  checks: PlaneConformanceCheck[];
  issues: SchemaIssue[];
  authority_boundary: {
    can_authorize: false;
    can_grant: false;
    can_merge: false;
    can_close: false;
    can_promote: false;
  };
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function validatePlaneContract(candidate: unknown, profile: PlaneProfile): PlaneContractValidation {
  const issues = validateJsonSchemaValue(candidate, sharedProfileSchema);
  if (profile === 'local') issues.push(...validateJsonSchemaValue(candidate, localProfileSchema));
  if (profile === 'remote') issues.push(...validateJsonSchemaValue(candidate, remoteProfileSchema));

  const candidateRecord = record(candidate);
  if (candidateRecord?.profile !== profile) {
    issues.push({ path: '$.profile', keyword: 'profile', message: `expected ${profile}` });
  }

  return { valid: issues.length === 0, profile, issues };
}

export function runPlaneConformance(
  candidate: unknown,
  evidence: unknown,
  profile: PlaneProfile,
): PlaneConformanceReport {
  const contract = validatePlaneContract(candidate, profile);
  const issues = [...contract.issues, ...validateJsonSchemaValue(evidence, evidenceSchema)];
  const candidateRecord = record(candidate);
  const evidenceRecord = record(evidence);
  const planeId = typeof candidateRecord?.plane_id === 'string' ? candidateRecord.plane_id : 'unknown';

  if (evidenceRecord?.plane_id !== planeId) {
    issues.push({ path: '$.plane_id', keyword: 'plane_id', message: 'contract and evidence plane_id must match' });
  }

  const failedPrefixes = new Set(
    issues
      .map((issue) => issue.path.match(/^\$\.observations\.([^.]+)/)?.[1])
      .filter((value): value is string => Boolean(value)),
  );
  const checks = (['admission', 'leases', 'receipts', 'refusals', 'idempotency', 'authority'] as const)
    .map((id): PlaneConformanceCheck => ({
      id,
      status: contract.valid && !failedPrefixes.has(id) && issues.length === 0 ? 'pass' : 'fail',
      evidence_path: `$.observations.${id}`,
    }));

  return {
    schema_version: 'plane-conformance-report.v0',
    plane_id: planeId,
    profile,
    verdict: issues.length === 0 ? 'pass' : 'fail',
    checks,
    issues,
    authority_boundary: {
      can_authorize: false,
      can_grant: false,
      can_merge: false,
      can_close: false,
      can_promote: false,
    },
  };
}

export function runPlaneContractVector(vector: unknown): PlaneContractValidation {
  const vectorRecord = record(vector);
  const profile = vectorRecord?.profile;
  if (profile !== 'shared' && profile !== 'local' && profile !== 'remote') {
    return {
      valid: false,
      profile: 'shared',
      issues: [{ path: '$.profile', keyword: 'profile', message: 'unknown conformance profile' }],
    };
  }
  return validatePlaneContract(vectorRecord?.candidate, profile);
}
