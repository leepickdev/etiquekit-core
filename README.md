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
```

Publication is gated separately. This candidate proves the public source tree
and package boundary before the `0.x` publish word.

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

## Product Boundary

Open core, closed reference planes:

- `@etiquekit/core` is public: schemas, state machines, authority/refusal rules,
  plane profiles, fixtures, conformance, and the sample plane.
- `@etiquekit/etq` is Leepick's thin local execution plane: installable and
  source-visible as distributed, but closed-development.
- `remote-etq` is Leepick's private managed execution plane.

License and distribution rights for an npm artifact are not the same as project
governance or contribution rights.
