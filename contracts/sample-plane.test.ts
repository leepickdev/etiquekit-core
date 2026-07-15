import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runPlaneConformance } from '@etiquekit/core/conformance';
import { runSamplePlaneConformance } from '../examples/sample-plane/conformance';

const PLANE_DIR = fileURLToPath(new URL('../examples/sample-plane/', import.meta.url));

describe('sample plane — shared-invariant conformance from core public surface alone', () => {
  test('the toy plane passes shared conformance with every check green', () => {
    const { report } = runSamplePlaneConformance();

    expect(report.verdict).toBe('pass');
    expect(report.issues).toEqual([]);
    expect(report.plane_id).toBe('etq-sample');
    expect(report.profile).toBe('shared');
    expect(report.checks).toHaveLength(6);
    expect(report.checks.every((check) => check.status === 'pass')).toBe(true);
    expect(new Set(report.checks.map((c) => c.id))).toEqual(
      new Set(['admission', 'leases', 'receipts', 'refusals', 'idempotency', 'authority']),
    );
  });

  test('the plane can neither authorize itself nor grant authority', () => {
    const { report } = runSamplePlaneConformance();
    expect(report.authority_boundary).toEqual({
      can_authorize: false,
      can_grant: false,
      can_merge: false,
      can_close: false,
      can_promote: false,
    });
  });

  test('evidence is DERIVED from real behaviour: refusals are typed and machine-readable', () => {
    const { evidence } = runSamplePlaneConformance();
    const observations = (evidence as { observations: Record<string, any> }).observations;

    // admission / lease / receipt negative paths actually fired
    expect(observations.admission.invalid_envelope_refused).toBe(true);
    expect(observations.admission.refusal_reason).toBe('invalid_task_envelope');
    expect(observations.leases.expired_refused).toBe(true);
    expect(observations.leases.revoked_refused).toBe(true);
    expect(observations.leases.point_of_effect_refused).toBe(true);
    expect(observations.receipts.missing_evidence_refused).toBe(true);

    // at least three DISTINCT typed refusal reasons were observed
    const reasons: string[] = observations.refusals.typed_reasons;
    expect(reasons.length).toBeGreaterThanOrEqual(3);
    expect(new Set(reasons).size).toBe(reasons.length);
    expect(reasons).toContain('invalid_task_envelope');
    expect(reasons).toContain('lease_expired');
    expect(reasons).toContain('receipt_requires_evidence_refs');

    // idempotency: repeat is an explicit duplicate record, never a silent success
    expect(observations.idempotency.repeat_outcome).toBe('explicit_duplicate_record');
    expect(observations.idempotency.silent_duplicate).toBe(false);
  });

  test('fails closed: tampered evidence (plane_id mismatch) is rejected', () => {
    const { candidate, evidence } = runSamplePlaneConformance();
    const tampered = { ...(evidence as Record<string, unknown>), plane_id: 'someone-else' };
    const report = runPlaneConformance(candidate, tampered, 'shared');
    expect(report.verdict).toBe('fail');
    expect(report.issues.length).toBeGreaterThan(0);
  });

  test('BY CONSTRUCTION: sample plane sources import only @etiquekit/core, zero control', () => {
    const sources = readdirSync(PLANE_DIR).filter((f) => f.endsWith('.ts'));
    expect(sources.length).toBeGreaterThan(0);

    for (const file of sources) {
      const src = readFileSync(PLANE_DIR + file, 'utf8');
      const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const spec of imports) {
        // every dependency is core's public surface or a sibling sample-plane file
        const allowed =
          spec === '@etiquekit/core' ||
          spec === '@etiquekit/core/conformance' ||
          spec.startsWith('./');
        expect(allowed, `${file} imports disallowed '${spec}'`).toBe(true);
        // never reach into control, nor into core's private internals
        expect(spec).not.toContain('packages/control');
        expect(spec).not.toContain('@etiquekit/control');
        expect(spec).not.toContain('/core/src/');
      }
    }
  });
});
