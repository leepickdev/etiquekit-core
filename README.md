# Etiquette Core

`@etiquekit/core` is the public governance contract for Etiquette-compatible
execution planes.

It contains portable schemas, pure state machines, authority and refusal rules,
plane capability profiles, conformance checks, and a minimal sample execution
plane. It does not contain Leepick's local `etq` implementation, remote workers,
hosted infrastructure, deployment manifests, credentials, or private workflow
state.

## Install

```sh
bun add @etiquekit/core
# or
npm install @etiquekit/core
```

`@etiquekit/core@0.2.0` is the current published contract package (0.2.0 adds
the portable execution binding, plane conformance profiles, and the lease
contract). Most teams will install `@etiquekit/etq` for the local CLI; `etq`
depends on this package and dogfoods the same contracts third-party planes
consume.

## Release model

This repository receives **assembled releases** from a private development
monorepo — commit cadence here is release cadence, not development cadence.
A quiet main between releases is the steady state, not abandonment: each
release lands as a reviewed PR (see the merged PR history) containing the
full assembled package, and the npm registry is published from exactly that
merged content.

## Verify

From the repo root:

```sh
bun install --frozen-lockfile
bun run gate:v2
bun test
bun run typecheck
```

The sample plane walkthrough lives at
`examples/sample-plane/WALKTHROUGH.md`.

## Docs

- [`docs/CONCEPTS.md`](docs/CONCEPTS.md): the shared vocabulary behind seats,
  envelopes, receipts, ledgers, leases, and execution planes.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): package boundaries and plane
  conformance rules.
- [`docs/README.md`](docs/README.md): the core docs index.

## Product Boundary

Open core, closed reference planes:

- `@etiquekit/core` is public: schemas, state machines, authority/refusal rules,
  plane profiles, fixtures, conformance, and the sample plane.
- [`@etiquekit/etq`](https://www.npmjs.com/package/@etiquekit/etq) is
  Leepick's thin local execution plane: CLI, git journal, worktree/session
  ergonomics, local evidence return, and developer-facing docs. Its public home
  is [`leepickdev/etq`](https://github.com/leepickdev/etq), and it consumes
  `@etiquekit/core`.
- `remote-etq` is Leepick's private managed execution plane.

License and distribution rights for an npm artifact are not the same as project
governance or contribution rights.
