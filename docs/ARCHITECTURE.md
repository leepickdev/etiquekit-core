# Architecture Boundary

`@etiquekit/core` is the public contract layer for Etiquette-compatible
execution planes.

It should not become a local CLI, hosted dashboard, chat product, managed
worker, or model wrapper. Those can all consume core, but they do not own its
truth.

## Packages And Planes

```text
@etiquekit/core  public open contract: schemas, state machines, refusal rules,
                 plane profiles, fixtures, and conformance
@etiquekit/etq   public thin local exec plane: CLI, git journal, worktrees,
                 local receipts, docs; consumes @etiquekit/core
remote-etq       private managed exec plane: API, sequencer, workers, tenancy,
                 hard-stop enforcement; consumes @etiquekit/core
```

Execution is a substrate, not an authority layer. Locally it is a CLI, shell,
worktree, or runner. Remotely it may be a managed execution container, sandbox,
or worker. In every plane, execution remains authority-false until the promotion
gate accepts evidence.

## Core Contains

- schemas and validators;
- pure state machines and transforms;
- authority and refusal rules;
- plane capability profiles;
- fixtures and conformance vectors;
- sample plane code demonstrating the contract.

## Core Excludes

- filesystem, git, process, network, or hosted runtime effects;
- local CLI command implementation;
- worktree/session ergonomics;
- remote workers, sequencers, tenancy, or deployment manifests;
- credentials, private workflow state, and customer data;
- Leepick's production local or remote execution implementation.

## Authority

Authority lives in explicit grants, task envelopes, and promotion gates.

- A seat can propose or execute only inside its envelope.
- A runner session is not a lane.
- A permission prompt is not a grant lease.
- A memory object is not truth.
- A dashboard is not the board.
- A reactor may tighten access, never loosen it.

Consequential mutations need receipt context:

```text
actor -> seat -> grant/ref -> allowed writes -> validation -> receipt
```

Authentication gives standing to occupy a seat. Authorization is checked at the
protected action and is conditional on current standing.

## Plane Conformance

A conformant execution plane must be able to:

- admit or refuse a task from a declared profile;
- preserve core refusal reasons;
- return evidence without self-authorizing;
- distinguish observed work from consumed or accepted work;
- expose enough receipt data for an independent promotion gate;
- fail closed on unknown authority, stale state, or out-of-profile requests.

The sample plane is intentionally small. It proves the contract without becoming
the production local or remote plane.

## Boundary Rule

The open reference is the core conformance kit plus the sample plane.
`@etiquekit/etq` is a production local plane that dogfoods core. `remote-etq` is
the private managed plane. Third-party planes should be able to implement the
same contract without copying either production plane.
