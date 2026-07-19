import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const packageJsonPath = new URL('../packages/core/package.json', import.meta.url);
const indexPath = new URL('../packages/core/src/index.ts', import.meta.url);

describe('@etiquekit/core package boundary', () => {
  test('is publishable from packages/core and declares only the accepted runtime dependency', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.name).toBe('@etiquekit/core');
    expect(packageJson.private).toBe(false);
    expect(packageJson.version).toBe('0.2.0');
    expect(packageJson.dependencies).toEqual({ zod: '4.3.6' });
    expect(packageJson.dependencies.yaml).toBeUndefined();
  });

  test('uses explicit named exports instead of wildcard facades', () => {
    const index = readFileSync(indexPath, 'utf8');
    const exportedNames = [...index.matchAll(/export\s*\{([\s\S]*?)\}\s*from/g)]
      .flatMap((match) => match[1].split(','))
      .map((entry) => entry.trim().replace(/^type\s+/, ''))
      .filter(Boolean);

    expect(index).not.toMatch(/export\s+\*/);
    // Step-1 classified 109 CORE rows. Two were wildcard facades over state
    // and incident; replacing those facades yielded 107 concrete API names.
    // F1 adds the portable authority lease surface as 13 explicit exports.
    expect(exportedNames).toHaveLength(120);
    expect(new Set(exportedNames).size).toBe(exportedNames.length);
    expect(index).not.toContain('AgentRuntimeAdapter');
    expect(index).not.toContain('ProjectManifest');
    expect(index).not.toContain('SupervisionDeps');
    expect(index).not.toContain('renderHuddleBoardMarkdown');
    expect(index).not.toContain('summarizeHuddleCard');
  });

  test('is consumed through its package name', async () => {
    const core = await import('@etiquekit/core');

    expect(core.assertTaskState('incoming')).toBe('incoming');
    expect(core.HuddleCardV1Schema).toBeDefined();
    expect(core.IncidentReceiptV1Schema).toBeDefined();
  });
});
