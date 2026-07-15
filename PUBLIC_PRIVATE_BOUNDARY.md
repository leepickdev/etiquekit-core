# Public / Private Boundary

Status: ratified and implemented for the public core split.

## Public Open Plane

The public repository is `leepickdev/etiquekit-core`. Its source tree may
contain:

- `packages/core/**`
- `examples/sample-plane/**`
- `contracts/**` needed to prove the public core and sample plane
- root governance docs, license, notice, and release lineage metadata
- gate scripts that verify the public boundary

`@etiquekit/core` contains schemas, pure state machines, authority and refusal
rules, plane capability profiles, conformance checks, and example code showing
how a third party can build a conformant execution plane. The package is
published on npm as `@etiquekit/core`.

## Closed Reference Planes

`@etiquekit/etq` is Leepick's thin local execution plane. It is installable
through npm, has a public home at `leepickdev/etq`, and consumes
`@etiquekit/core`; it is not the open reference implementation.

`remote-etq` is Leepick's private managed execution plane.

The open reference is the core conformance kit plus the sample plane, not the
production local or remote plane.

## Structural Gate V2

The public candidate fails if it contains:

- `packages/control/**`
- remote, hosted, managed-plane, runtime, integration, linear, or MCP
  implementation directories
- deployment manifests or credentials
- private repository pointers
- local-machine absolute paths

Trust statement:

> License/distribution rights for the npm artifact are not the same as project
> governance or contribution rights.
