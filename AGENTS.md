# Agent Instructions

## Repository Role

This repository is the public source home for `@etiquekit/core`.

It contains the open core contract for Etiquette-compatible agent-work planes:
schemas, pure state machines, authority and refusal rules, capability profiles,
conformance checks, and a sample plane.

It is not the local execution plane and not the managed execution plane:

- `@etiquekit/etq` is Leepick's thin local execution plane and consumes this
  package.
- `remote-etq` is Leepick's private managed execution plane.
- The open reference is the conformance kit plus `examples/sample-plane`.

## Commands

Run these before proposing or publishing changes:

```bash
bun install --frozen-lockfile
bun run gate:v2
bun run typecheck
bun test
```

Equivalent one-command local gate:

```bash
bun run ci
```

## Core Rules

- Keep `packages/core/src` pure: no filesystem, network, process, shell, or
  platform I/O.
- Keep runtime dependencies minimal. In v0, `packages/core` may depend only on
  `zod` at the pinned version in `packages/core/package.json`.
- Use explicit named exports from `packages/core/src/index.ts`; do not add
  wildcard `export *` facades.
- Keep JSON Schemas valid under Draft 2020-12.
- Do not add local execution-plane, hosted, managed, runtime, integration,
  Linear, MCP, or deployment surfaces to this repository.
- Do not commit local machine paths, private repository pointers, credentials,
  generated secrets, or deployment manifests.

## Package Boundary

Only `packages/core` is publishable to npm as `@etiquekit/core`.

The root package is private and exists to run repository gates and examples.
Publishing must pack from `packages/core`, not the repository root.

## Review Expectations

Changes should include a focused test or contract update when they alter a
schema, state transition, authority/refusal rule, conformance vector, or public
export.

If a change cannot be proven by `bun run ci`, document the missing proof before
requesting review.
