# Build your own Etiquette exec plane

This is a working, ~200-line **toy exec plane** that passes the shared-invariant
conformance profile using **only** `@etiquekit/core`'s public surface — the same
package any third-party developer would install. It was written by a seat that
never built core, on purpose: if the public surface is enough to build a
conformant plane here, it's enough for the ecosystem. Every spot where core's
surface fell short is a **finding** at the bottom of this doc, not a workaround.

## The claim, proven by construction

> A developer can build a conformant execution plane from `@etiquekit/core`
> alone, without importing anything from `packages/control`.

`contracts/sample-plane.test.ts` proves it three ways:

1. the plane passes `runPlaneConformance(...)` with all six checks green;
2. the evidence is **derived from real behaviour** (each observation reads an
   actual accept/refuse outcome — nothing is hardcoded to `true`);
3. a source scan asserts the plane imports **only** `@etiquekit/core`,
   `@etiquekit/core/conformance`, and its own sibling files — zero control,
   zero reaching into `core/src` internals.

## The six shared invariants and how the toy plane honours each

| Invariant | Core surface used | Toy plane behaviour |
|---|---|---|
| **admission** | `parseHuddleCardV1` | a huddle card *is* the task envelope; an invalid one (e.g. empty `allowed_writes`) is a **typed refusal** `invalid_task_envelope` |
| **leases** | `evaluateAuthorityLeaseAction` + `AuthorityLease` | plane uses core's portable lease contract; validated **at the point of effect** — expired / revoked / revoked-at-effect each refuse |
| **receipts** | `parsePortableExitReceiptV1` | a terminal receipt is required and must carry `evidence_refs`; empty refs → `receipt_requires_evidence_refs` |
| **refusals** | *(plane-local)* | every refusal is `{ ok:false, reason, detail }` with a machine-readable `reason` code; ≥3 distinct reasons observed |
| **idempotency** | *(plane-local)* | in-memory journal keyed by idempotency key; a repeat is an **explicit duplicate record**, never a silent second effect |
| **authority** | conformance contract | plane declares and enforces: cannot authorize / grant / merge / close / promote — every such request is `authority_denied` |

## Steps to build your own

1. **Depend on core only.** `import { parseHuddleCardV1, parsePortableExitReceiptV1 } from '@etiquekit/core'`
   and `import { runPlaneConformance } from '@etiquekit/core/conformance'`. Nothing else.
2. **Model admission** on core's envelope schema (`parseHuddleCardV1`). Wrap the
   throw into a typed refusal so an invalid envelope is a *result*, not a crash.
3. **Enforce leases at the point of effect**, not at issue time — check expiry
   and revocation against the "now" of the effect (`plane.ts#actUnderLease`).
4. **Require evidence on receipts** (`parsePortableExitReceiptV1` + non-empty
   `evidence_refs`).
5. **Make every refusal typed** — a `reason` union, not a free-text string.
6. **Keep an idempotency journal** so retries are explicit, never silently
   duplicated.
7. **Declare and enforce your authority boundary** — the plane authorizes
   nothing. Declaring conformance is not self-granting.
8. **Derive evidence from behaviour**, then call `runPlaneConformance(candidate,
   evidence, 'shared')`. See `conformance.ts` — it runs the positive *and*
   negative path of each invariant and reads the outcomes into the evidence.

Run it:

```sh
bun install                       # link the @etiquekit/core workspace
bun test contracts/sample-plane.test.ts
```

## Findings — core publishability gaps surfaced by this exercise

These are the places core's PUBLIC surface did not directly cover a shared
invariant. None blocked the toy plane (it defined the missing shape honestly),
but each is a candidate for core before the open-core flip so ecosystem planes
don't each reinvent it.

- **F1 (leases): resolved in the pre-flip lease-contract slice.** Core now
  exports `AuthorityLease`, `parseAuthorityLease`, and
  `evaluateAuthorityLeaseAction`; this sample plane consumes that public surface
  instead of defining its own lease shape.

- **F2 (evidence ergonomics): resolved enough for v0.** Core now exports the
  `PlaneConformanceEvidenceV0` TypeScript type beside the authoritative JSON
  schema, so consumers get compile-time guidance and runtime fail-closed checks.

Neither is a correctness hole: the conformance runner still fails closed on any
mismatch (see the tampered-evidence test). They are surface-completeness notes
found *before* the flip, which is the point of routing this to a fresh seat.
