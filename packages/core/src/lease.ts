type JsonRecord = Record<string, unknown>;

export const AUTHORITY_LEASE_SCHEMA = 'authority_lease.v0';
export const AUTHORITY_LEASE_ACTION_VALIDATION_SCHEMA = 'authority-lease-action-validation.v0';

export interface AuthorityLeasePrincipal {
  principal: string;
  authority_source: 'human_gate' | 'policy_gate' | 'human_or_policy_gate';
}

export interface AuthorityLeaseSubject {
  seat_id: string;
  operator_principal?: string;
}

export interface AuthorityLeaseScope {
  repo_ref?: string;
  workflow?: string;
  task_classes: string[];
}

export interface AuthorityLeaseValidationEnvelope {
  required: string[];
}

export interface AuthorityLeaseAuthorityFlags {
  can_mint_authority: false;
  can_extend_own_lease: false;
  can_subdelegate: false;
  can_auto_merge_in_v0: false;
}

export interface AuthorityLease {
  schema: typeof AUTHORITY_LEASE_SCHEMA;
  lease_id: string;
  issued_at: string;
  expires_at: string;
  issued_by: AuthorityLeasePrincipal;
  issued_to: AuthorityLeaseSubject;
  scope: AuthorityLeaseScope;
  allowed_tools: string[];
  gated_tools: string[];
  forbidden_tools: string[];
  validation_envelope: AuthorityLeaseValidationEnvelope;
  revocation: {
    canonical_revocation_ref: string | null;
  };
  authority_flags: AuthorityLeaseAuthorityFlags;
}

export interface AuthorityLeaseCanonicalState {
  at: string;
  revoked_lease_ids?: string[];
}

export interface AuthorityLeaseValidationInput {
  capability: string;
  validation_results: Record<string, boolean>;
  canonical_state: AuthorityLeaseCanonicalState;
  evidence_ref?: string;
}

export interface AuthorityLeaseActionValidation {
  schema: typeof AUTHORITY_LEASE_ACTION_VALIDATION_SCHEMA;
  lease_ref: string;
  capability_used: string;
  verdict: 'legitimate' | 'blocked';
  reasons: string[];
  validation: {
    required: string[];
    passed: string[];
    missing_or_failed: string[];
  };
  evidence_ref: string | null;
  authority_boundary: AuthorityLeaseAuthorityFlags & {
    minted_authority: false;
    point_of_effect_checked: true;
    telemetry_is_audit_log: false;
  };
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

function optionalString(record: JsonRecord, field: string): string | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string when present`);
  }
  return value.trim();
}

function asStringArray(record: JsonRecord, field: string): string[] {
  const value = record[field];
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${field} must be a non-empty string array`);
  return value.map((item) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(`${field} must contain only non-empty strings`);
    }
    return item.trim();
  });
}

function asFalse(record: JsonRecord, field: keyof AuthorityLeaseAuthorityFlags): false {
  if (record[field] !== false) throw new Error(`authority_flags.${field} must be false`);
  return false;
}

function assertIso(value: string, field: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${field} must be an ISO-8601 timestamp`);
  return date.toISOString();
}

function assertPortableRef(value: string, field: string): void {
  if (value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value)) {
    throw new Error(`${field} must be an opaque or repo-relative ref, not a local absolute path`);
  }
  if (/[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    throw new Error(`${field} must be an opaque or repo-relative ref, not a URL`);
  }
}

function assertNonOverlapping(left: string[], right: string[], leftName: string, rightName: string): void {
  const overlap = left.filter((item) => right.includes(item));
  if (overlap.length > 0) throw new Error(`${leftName} and ${rightName} overlap: ${overlap.join(', ')}`);
}

function parsePrincipal(value: unknown, field: string): AuthorityLeasePrincipal {
  const record = asRecord(value, field);
  const source = asString(record, 'authority_source');
  if (!['human_gate', 'policy_gate', 'human_or_policy_gate'].includes(source)) {
    throw new Error('authority_source must be one of: human_gate, policy_gate, human_or_policy_gate');
  }
  return {
    principal: asString(record, 'principal'),
    authority_source: source as AuthorityLeasePrincipal['authority_source'],
  };
}

function parseSubject(value: unknown): AuthorityLeaseSubject {
  const record = asRecord(value, 'issued_to');
  return {
    seat_id: asString(record, 'seat_id'),
    operator_principal: optionalString(record, 'operator_principal'),
  };
}

function parseScope(value: unknown): AuthorityLeaseScope {
  const record = asRecord(value, 'scope');
  const repoRef = optionalString(record, 'repo_ref');
  if (repoRef) assertPortableRef(repoRef, 'scope.repo_ref');
  return {
    repo_ref: repoRef,
    workflow: optionalString(record, 'workflow'),
    task_classes: asStringArray(record, 'task_classes'),
  };
}

function parseAuthorityFlags(value: unknown): AuthorityLeaseAuthorityFlags {
  const record = asRecord(value, 'authority_flags');
  return {
    can_mint_authority: asFalse(record, 'can_mint_authority'),
    can_extend_own_lease: asFalse(record, 'can_extend_own_lease'),
    can_subdelegate: asFalse(record, 'can_subdelegate'),
    can_auto_merge_in_v0: asFalse(record, 'can_auto_merge_in_v0'),
  };
}

export function parseAuthorityLease(value: unknown): AuthorityLease {
  const record = asRecord(value, 'authority lease');
  if (record.schema !== AUTHORITY_LEASE_SCHEMA) throw new Error(`schema must be ${AUTHORITY_LEASE_SCHEMA}`);
  const issuedAt = assertIso(asString(record, 'issued_at'), 'issued_at');
  const expiresAt = assertIso(asString(record, 'expires_at'), 'expires_at');
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) throw new Error('expires_at must be after issued_at');
  const allowedTools = asStringArray(record, 'allowed_tools');
  const gatedTools = asStringArray(record, 'gated_tools');
  const forbiddenTools = asStringArray(record, 'forbidden_tools');
  assertNonOverlapping(allowedTools, forbiddenTools, 'allowed_tools', 'forbidden_tools');
  assertNonOverlapping(gatedTools, forbiddenTools, 'gated_tools', 'forbidden_tools');
  const validation = asRecord(record.validation_envelope, 'validation_envelope');
  const revocation = asRecord(record.revocation, 'revocation');
  const canonicalRevocationRef = revocation.canonical_revocation_ref;
  if (canonicalRevocationRef !== null && typeof canonicalRevocationRef !== 'string') {
    throw new Error('revocation.canonical_revocation_ref must be a string or null');
  }
  if (typeof canonicalRevocationRef === 'string') assertPortableRef(canonicalRevocationRef, 'revocation.canonical_revocation_ref');
  return {
    schema: AUTHORITY_LEASE_SCHEMA,
    lease_id: asString(record, 'lease_id'),
    issued_at: issuedAt,
    expires_at: expiresAt,
    issued_by: parsePrincipal(record.issued_by, 'issued_by'),
    issued_to: parseSubject(record.issued_to),
    scope: parseScope(record.scope),
    allowed_tools: allowedTools,
    gated_tools: gatedTools,
    forbidden_tools: forbiddenTools,
    validation_envelope: {
      required: asStringArray(validation, 'required'),
    },
    revocation: {
      canonical_revocation_ref: canonicalRevocationRef,
    },
    authority_flags: parseAuthorityFlags(record.authority_flags),
  };
}

export function evaluateAuthorityLeaseAction(
  rawLease: unknown,
  input: AuthorityLeaseValidationInput,
): AuthorityLeaseActionValidation {
  const lease = parseAuthorityLease(rawLease);
  const reasons: string[] = [];
  const pointInTime = Date.parse(assertIso(input.canonical_state.at, 'canonical_state.at'));
  if (pointInTime >= Date.parse(lease.expires_at)) reasons.push('lease_expired');
  if (lease.revocation.canonical_revocation_ref) reasons.push('lease_revoked');
  if ((input.canonical_state.revoked_lease_ids ?? []).includes(lease.lease_id)) {
    reasons.push('lease_revoked_at_point_of_effect');
  }
  if (lease.forbidden_tools.includes(input.capability)) reasons.push('capability_forbidden');
  if (lease.gated_tools.includes(input.capability)) reasons.push('capability_requires_external_gate');
  if (!lease.allowed_tools.includes(input.capability)) reasons.push('capability_not_allowed');
  const missingOrFailed = lease.validation_envelope.required.filter((item) => input.validation_results[item] !== true);
  if (missingOrFailed.length > 0) reasons.push('validation_envelope_failed');
  const passed = lease.validation_envelope.required.filter((item) => input.validation_results[item] === true);
  return {
    schema: AUTHORITY_LEASE_ACTION_VALIDATION_SCHEMA,
    lease_ref: lease.lease_id,
    capability_used: input.capability,
    verdict: reasons.length === 0 ? 'legitimate' : 'blocked',
    reasons,
    validation: {
      required: lease.validation_envelope.required,
      passed,
      missing_or_failed: missingOrFailed,
    },
    evidence_ref: input.evidence_ref ?? null,
    authority_boundary: {
      ...lease.authority_flags,
      minted_authority: false,
      point_of_effect_checked: true,
      telemetry_is_audit_log: false,
    },
  };
}
