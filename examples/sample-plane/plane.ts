// A toy exec plane built to prove one claim by construction: a developer who
// never built @etiquekit/core can implement a shared-invariant-conformant plane
// from core's PUBLIC surface alone.
//
// THE CONSTRAINT IS THE POINT: every import below is from '@etiquekit/core' or
// '@etiquekit/core/conformance'. There is ZERO import from packages/control.
// Any behaviour core's public surface could not express became a finding in
// WALKTHROUGH.md, not a control import.
//
// Scale is deliberately tiny: in-memory journal, a single seat, no git / fs /
// process. Admission, leases, receipts, refusals, idempotency, and authority in
// their minimal honest form.

import {
  evaluateAuthorityLeaseAction,
  parseHuddleCardV1,
  parsePortableExitReceiptV1,
  type AuthorityLease,
  type AuthorityLeaseCanonicalState,
  type HuddleCardV1,
  type PortableExitReceiptV1,
} from '@etiquekit/core';

// ---------------------------------------------------------------------------
// Typed refusals — every refusal carries a machine-readable reason code.
// ---------------------------------------------------------------------------

export type RefusalReason =
  | 'invalid_task_envelope'
  | 'lease_expired'
  | 'lease_revoked'
  | 'lease_revoked_at_point_of_effect'
  | 'lease_validation_failed'
  | 'receipt_requires_evidence_refs'
  | 'authority_denied';

export type Refused = { ok: false; reason: RefusalReason; detail: string };
export type Accepted<T> = { ok: true; value: T };
export type Outcome<T> = Accepted<T> | Refused;

const refuse = (reason: RefusalReason, detail: string): Refused => ({ ok: false, reason, detail });
const accept = <T>(value: T): Accepted<T> => ({ ok: true, value });

// ---------------------------------------------------------------------------
// Leases — core ships the portable lease contract and point-of-effect evaluator.
// ---------------------------------------------------------------------------
// Idempotency journal — in-memory, keyed by idempotency key. A repeat is an
// EXPLICIT duplicate record, never a silent second effect.
// ---------------------------------------------------------------------------

export type ApplyResult<T> =
  | { outcome: 'applied'; value: T }
  | { outcome: 'explicit_duplicate_record'; value: T };

export class SamplePlane {
  readonly planeId: string;
  private readonly journal = new Map<string, unknown>();
  private readonly refusals: RefusalReason[] = [];

  // The plane cannot authorize, grant, merge, close, or promote. These are
  // declared false and enforced: any such request is a typed refusal.
  readonly authority = {
    plane_can_self_grant: false,
    can_authorize: false,
    can_merge: false,
    can_close: false,
    can_promote: false,
  } as const;

  constructor(planeId: string) {
    this.planeId = planeId;
  }

  /** ADMISSION — a task envelope is required; an invalid one is a typed refusal. */
  admit(envelope: unknown): Outcome<HuddleCardV1> {
    try {
      return accept(parseHuddleCardV1(envelope));
    } catch (error) {
      return this.track(refuse('invalid_task_envelope', errText(error)));
    }
  }

  /** LEASES — validated at the POINT OF EFFECT: expiry and revocation both refuse. */
  actUnderLease(lease: AuthorityLease, effect: AuthorityLeaseCanonicalState): Outcome<'effected'> {
    const result = evaluateAuthorityLeaseAction(lease, {
      capability: 'edit_allowed_files',
      validation_results: {
        diff_within_allowed_writes: true,
        validation_commands_green: true,
        receipt_written: true,
      },
      canonical_state: effect,
      evidence_ref: 'receipt:sample-plane',
    });
    if (result.verdict === 'legitimate') {
      return accept('effected');
    }
    const reason = result.reasons[0] ?? 'lease_validation_failed';
    if (
      reason === 'lease_expired' ||
      reason === 'lease_revoked' ||
      reason === 'lease_revoked_at_point_of_effect'
    ) {
      return this.track(refuse(reason, result.reasons.join(',')));
    }
    return this.track(refuse('lease_validation_failed', result.reasons.join(',')));
  }

  /** RECEIPTS — a terminal receipt is required and must carry evidence refs. */
  recordReceipt(receipt: unknown): Outcome<PortableExitReceiptV1> {
    let parsed: PortableExitReceiptV1;
    try {
      parsed = parsePortableExitReceiptV1(receipt);
    } catch (error) {
      return this.track(refuse('receipt_requires_evidence_refs', errText(error)));
    }
    if (parsed.evidence_refs.length === 0) {
      return this.track(refuse('receipt_requires_evidence_refs', 'evidence_refs empty'));
    }
    return accept(parsed);
  }

  /** IDEMPOTENCY — a repeated key yields an EXPLICIT duplicate record, not a silent success. */
  apply<T>(key: string, effect: () => T): ApplyResult<T> {
    if (this.journal.has(key)) {
      return { outcome: 'explicit_duplicate_record', value: this.journal.get(key) as T };
    }
    const value = effect();
    this.journal.set(key, value);
    return { outcome: 'applied', value };
  }

  /** AUTHORITY — the plane refuses to self-grant/authorize/merge/close/promote. */
  requestAuthority(action: 'authorize' | 'grant' | 'merge' | 'close' | 'promote'): Refused {
    return this.track(refuse('authority_denied', `plane cannot ${action}`));
  }

  /** The distinct typed refusal reasons this plane has actually emitted. */
  observedRefusalReasons(): RefusalReason[] {
    return [...new Set(this.refusals)];
  }

  private track(refusal: Refused): Refused {
    this.refusals.push(refusal.reason);
    return refusal;
  }
}

function errText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
