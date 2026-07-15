#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const path = join(dir, name);
    const rel = relative(root, path);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, out);
    } else {
      out.push(rel);
    }
  }
  return out;
}

const files = walk(root).sort();

const forbiddenPathPrefixes = [
  'bin/',
  'lib/',
  'packages/control/',
  'remote/',
  'hosted/',
  'managed/',
  'runtime/',
  'integration/',
  'linear/',
  'mcp/',
  'agent-plane/',
  'templates/hosted-receiver/',
  '.github/workflows/release',
  'dist/',
];

for (const file of files) {
  for (const prefix of forbiddenPathPrefixes) {
    if (file.startsWith(prefix)) fail(`forbidden path in public core candidate: ${file}`);
  }
}

const requiredPaths = [
  'LICENSE',
  'NOTICE',
  'README.md',
  'PUBLIC_PRIVATE_BOUNDARY.md',
  'package.json',
  'tsconfig.json',
  'packages/core/package.json',
  'packages/core/src/index.ts',
  'packages/core/src/lease.ts',
  'packages/core/src/conformance/index.ts',
  'examples/sample-plane/WALKTHROUGH.md',
  'contracts/sample-plane.test.ts',
  'release/etiquekit-core-lineage.v0.json',
];

for (const path of requiredPaths) {
  if (!existsSync(join(root, path))) fail(`required public core file missing: ${path}`);
}

const rootPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const corePackage = JSON.parse(readFileSync(join(root, 'packages/core/package.json'), 'utf8'));

if (rootPackage.private !== true) fail('root package.json must stay private; only packages/core is publishable');
if (rootPackage.bin) fail('root package.json must not expose CLI bins');
if (corePackage.name !== '@etiquekit/core') fail('packages/core package name must be @etiquekit/core');
if (corePackage.private === true) fail('packages/core must be publishable in the public core candidate');
if (corePackage.dependencies && Object.keys(corePackage.dependencies).some((dep) => dep !== 'zod')) {
  fail('packages/core dependencies must remain core-only; only zod is allowed in v0');
}
if (corePackage.dependencies?.zod !== '4.3.6') fail('packages/core must pin zod 4.3.6 for this candidate');

const tsImportPattern = /from\s+['"]([^'"]+)['"]/g;
for (const file of files.filter((f) => f.endsWith('.ts'))) {
  const source = readFileSync(join(root, file), 'utf8');
  for (const match of source.matchAll(tsImportPattern)) {
    const spec = match[1];
    if (spec.includes('packages/control') || spec === '@etiquekit/control' || spec.startsWith('@etiquekit/etq')) {
      fail(`forbidden local-plane import in ${file}: ${spec}`);
    }
    if (file.startsWith('examples/sample-plane/') && spec.includes('/core/src/')) {
      fail(`private core internals import in ${file}: ${spec}`);
    }
  }
}

const textFiles = files.filter((f) => /\.(md|json|ts|mjs|txt)$/.test(f));
for (const file of textFiles) {
  const text = readFileSync(join(root, file), 'utf8');
  if (
    text.includes('/Users/justinemassawe/') &&
    file !== 'release/etiquekit-core-lineage.v0.json' &&
    file !== 'scripts/gate-v2-check.mjs'
  ) {
    fail(`local machine path leaked outside lineage manifest: ${file}`);
  }
}

if (failures.length > 0) {
  console.error('gate-v2: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`gate-v2: PASS (${files.length} files checked)`);
