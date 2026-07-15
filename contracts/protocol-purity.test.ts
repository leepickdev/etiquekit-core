import { test, expect } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// Product boundary: @etiquekit/core is a pure protocol library —
// no filesystem, network, or process I/O, ever. Placement algorithm rule 1.
const CORE_SRC = new URL('../packages/core/src', import.meta.url).pathname;
const ALLOWED_BARE_IMPORTS = new Set(['zod']);

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsFiles(p));
    else if (name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function importSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) specs.push(m[1]);
  }
  return specs;
}

test('@etiquekit/core imports nothing capable of I/O', () => {
  const files = tsFiles(CORE_SRC);
  expect(files.length).toBeGreaterThan(0);

  const violations: string[] = [];
  for (const file of files) {
    for (const spec of importSpecifiers(readFileSync(file, 'utf8'))) {
      const relative = spec.startsWith('./') || spec.startsWith('../');
      if (!relative && !ALLOWED_BARE_IMPORTS.has(spec)) {
        violations.push(`${file}: imports '${spec}'`);
      }
    }
  }

  expect(violations).toEqual([]);
});
