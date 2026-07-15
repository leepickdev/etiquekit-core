# Review Checklist

Use this checklist for pull requests and agent review returns.

## Required Gates

```bash
bun install --frozen-lockfile
bun run gate:v2
bun run typecheck
bun test
```

## Boundary

- The public repo must remain `@etiquekit/core` only.
- `packages/control`, `@etiquekit/etq`, `remote-etq`, hosted runtimes,
  deployment manifests, and private repo pointers do not belong here.
- The root package must remain private.
- `packages/core` must remain publishable and must not expose CLI bins.

## Purity

- `packages/core/src` must not import filesystem, network, process, shell, or
  platform I/O.
- Runtime dependencies must remain limited to the accepted core dependency set.
  In v0 that set is only `zod`.

## API Surface

- Public exports must be explicit named exports from
  `packages/core/src/index.ts`.
- Do not use wildcard facades.
- New schemas, state machines, refusal rules, conformance profiles, or vectors
  need contract tests or vector coverage.

## Provenance

- Do not accept local machine paths, private repository paths, credentials, or
  unpublished deployment references in tracked files.
- If a release artifact is discussed, verify the exact commit, tree, tarball
  checksum, and npm dry-run or publish output.

## Review Output

Lead with one verdict:

- `CONFIRM`
- `CONFIRM_WITH_AMENDMENTS`
- `COUNTER`

Then cite the exact files, commands, and evidence that support the verdict.
