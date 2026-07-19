# Core Concepts

Etiquette is a governance and evidence layer for agent-assisted engineering
work. It does not try to be the agent, IDE, chat room, or cloud runtime.

```text
seat -> task envelope -> session -> execution -> receipt -> promotion gate
```

`@etiquekit/core` defines the portable contract behind that loop. Execution
planes such as `@etiquekit/etq`, third-party local tools, or managed runners
consume the contract and return evidence. Promotion remains outside execution.

## Seat

A seat is a durable work identity. A human, agent, or runtime can occupy it, but
the workflow routes to the seat, not to a model name or terminal.

| Concept | Answers |
| --- | --- |
| Operator principal | Who is accountable for intent or approval? |
| Seat | What durable work role or capability is acting? |
| Runtime | Which tool, model, process, or container executed? |
| Session | Which bounded run produced evidence? |

## Task Envelope

A task envelope says what work is allowed: owner, mode, allowed writes,
forbidden writes, validation, stop conditions, expected receipt, and next owner.

If a task does not name the write boundary and validation, it is not ready for
autonomous execution.

## Session

A session is a bounded run inside one repo, runner, or managed execution
context. Use one for a bug fix, feature slice, review, release canary, or short
parallel review window; not for a product, quarter, or organization.

## Execution Identity And Binding

A seat remains the durable routing identity. A temporary occupant has a stable
`occupancy_id`; each runtime conversation has an opaque `session_id`; the
observed runtime is `runner_binding_actual`; and `binding_epoch` orders rebinds
within one `(seat_id, occupancy_id)` lineage. The roster owns whether an
occupancy is expected or retired. Core owns only the portable meanings and
pure validation rules.

An execution binding correlates that identity with one parent seat, execution
and subrun, exact task, profile, scope, capability set, immutable context hash,
and requested output. It is checked again at the point of effect. Expiry is
exclusive: `now >= expires_at` refuses.

Terminal receipts reference the binding and execution. A pure compare-and-set
transition permits one terminal append, makes an identical retry explicitly
idempotent, and refuses a conflicting or concurrent terminal write. The
receipt remains evidence and authority-false. Only a matching parent acceptance
can make it eligible to bridge into canonical workflow truth.

## Receipt

A receipt proves what happened: changed files or artifacts, validation results,
runbook refs, blockers, risks, and next owner. It is evidence; it does not
approve itself.

## Ledger

A ledger is the durable work record for a repo or workspace: decisions,
receipts, state changes, and refs. Raw execution chatter belongs in session
runbooks, scratch space, or restricted capsules, not in the shared contract.

Generated query indexes and dashboards are rebuildable projections. The
append-only record is the auditable source.

## Promotion Gate

The promotion gate is where candidate work becomes accepted truth.

The gate is resolved by policy: owner, role, quorum, risk class, changed
surface, and current standing. It should not be hardcoded to one person, model,
or runtime unless policy says that principal owns the action class.

## Authority Lease

An authority lease is a narrow, expiring permission to spend an existing grant.
Spend can nest, bounded. Mint never nests.

Core leases cover reversible work, tool use, validation, candidate return, and
local orchestration. They do not cover auto-merge, signing, release, protected
branch push, secret rotation, cloud activation, or policy mutation.

Every lease check happens at the point of effect against current state, not from
a stale local cache.

## Execution Plane

An execution plane is any runtime surface that does work against the core
contract: the local `etq` CLI, a local shell, Codex, Claude Code, Gemini,
Ollama, a script, a container, or a managed execution container.

Execution may run, observe, retry safe work, and return evidence. It must not
grant, merge, close, promote, or mutate canonical truth.

## Memory And Projections

Memory is cited context. Dashboards, boards, and search indexes are projections.
They help a seat find prior decisions, receipts, risks, and patterns.

Memory proposes. Ledgers authorize. Receipts prove. Audit logs account.

## Integrations

External tools keep their native jobs: chat is conversation, planning tools are
planning, code hosts are review, observability is incident evidence, and
identity systems are identity.

Etiquette is the accountability contract. External "Done" is not acceptance.
Authentication is not authorization.
