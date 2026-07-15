# Public / Private Boundary

Status: draft pending Zach edit, per `bus://5036` Annex B and `bus://5040`.

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
how a third party can build a conformant execution plane.

## Closed Reference Planes

`@etiquekit/etq` is Leepick's thin local execution plane. It is installable and
source-visible as distributed through npm, but it is not an open-development
public repository and it is not the open reference implementation.

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
