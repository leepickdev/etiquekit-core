# Etiquette Core Docs

Start here if you are building an execution plane, adapter, verifier, or UI
against `@etiquekit/core`.

## Package Map

- [`@etiquekit/core`](https://www.npmjs.com/package/@etiquekit/core) is the
  public open governance contract: schemas, pure state machines,
  authority/refusal rules, plane profiles, fixtures, and conformance.
- [`@etiquekit/etq`](https://github.com/leepickdev/etq) is Leepick's thin local
  execution plane. It consumes core and adds CLI, local git journal, worktrees,
  receipts, and developer-facing workflow docs.
- `remote-etq` is Leepick's private managed execution plane.

## Read Next

- [CONCEPTS.md](CONCEPTS.md): seats, task envelopes, receipts, ledgers,
  authority leases, and execution planes.
- [ARCHITECTURE.md](ARCHITECTURE.md): package boundaries and what a conformant
  plane may or may not do.
- [../PUBLIC_PRIVATE_BOUNDARY.md](../PUBLIC_PRIVATE_BOUNDARY.md): what belongs
  in the public core repo versus the local and remote planes.
- [../examples/sample-plane/WALKTHROUGH.md](../examples/sample-plane/WALKTHROUGH.md):
  the smallest conformant execution plane.

Local CLI procedures remain in the `@etiquekit/etq` repo. Core docs describe
the shared contract those procedures consume.
