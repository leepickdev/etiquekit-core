import { z } from 'zod';

export const HUDDLE_CARD_MODES = ['read-only', 'docs-only', 'implementation', 'review'] as const;
export const HUDDLE_CARD_STATUSES = [
  'ready',
  'claimed',
  'in_progress',
  'waiting_return',
  'accepted',
  'blocked',
  'stale',
] as const;
export const HUDDLE_EXIT_RECEIPT_VERDICTS = ['accept', 'counter', 'blocked'] as const;
export const PORTABLE_EXIT_RECEIPT_OUTCOMES = ['success', 'partial', 'blocked'] as const;

export type HuddleCardMode = (typeof HUDDLE_CARD_MODES)[number];
export type HuddleCardStatus = (typeof HUDDLE_CARD_STATUSES)[number];
export type HuddleExitReceiptVerdict = (typeof HUDDLE_EXIT_RECEIPT_VERDICTS)[number];
export type PortableExitReceiptOutcome = (typeof PORTABLE_EXIT_RECEIPT_OUTCOMES)[number];

const nonEmptyString = z.string().trim().min(1);

const stringList = z.array(nonEmptyString);
const validationEntry = z.union([
  nonEmptyString,
  z.object({
    command: nonEmptyString,
    result: nonEmptyString,
  }).passthrough(),
]);

function looksLikeChatMemoryPath(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('chat-history') ||
    normalized.includes('chat_history') ||
    normalized.includes('chatlog') ||
    normalized.includes('chat-memory') ||
    normalized.includes('conversation-log') ||
    normalized.includes('transcript')
  );
}

export const HuddleCardV1Schema = z.object({
  schema_version: z.literal('huddle-card.v1'),
  repo: nonEmptyString,
  repo_path: nonEmptyString.optional(),
  lane: nonEmptyString,
  task_id: nonEmptyString,
  mode: z.enum(HUDDLE_CARD_MODES),
  status: z.enum(HUDDLE_CARD_STATUSES).default('ready'),
  startup_docs: stringList.min(1),
  task_packet: nonEmptyString.optional(),
  allowed_writes: stringList,
  forbidden_sources: stringList,
  validation: stringList.min(1),
  stop_conditions: stringList.min(1),
  expected_return: stringList.min(1),
  evidence_sink: nonEmptyString.optional(),
  current_owner: nonEmptyString,
  next_owner: nonEmptyString,
  expires_or_refresh_after: nonEmptyString,
}).superRefine((card, ctx) => {
  for (const [index, source] of card.startup_docs.entries()) {
    if (looksLikeChatMemoryPath(source)) {
      ctx.addIssue({
        code: 'custom',
        path: ['startup_docs', index],
        message: 'startup_docs must point to repo-local source of truth, not chat logs or transcripts',
      });
    }
  }

  const forbiddenText = card.forbidden_sources.join(' ').toLowerCase();
  if (!forbiddenText.includes('chat') && !forbiddenText.includes('transcript')) {
    ctx.addIssue({
      code: 'custom',
      path: ['forbidden_sources'],
      message: 'forbidden_sources should explicitly ban chat/transcript memory for rotation-safe pickup',
    });
  }

  if (card.mode === 'implementation') {
    const usefulWrites = card.allowed_writes.filter((entry) => entry !== 'read-only');
    if (usefulWrites.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['allowed_writes'],
        message: 'implementation cards must declare concrete allowed_writes',
      });
    }
  }
});

export type HuddleCardV1 = z.infer<typeof HuddleCardV1Schema>;

export const HuddleExitReceiptV1Schema = z.object({
  schema_version: z.literal('huddle-exit-receipt.v1'),
  task_id: nonEmptyString,
  verdict: z.enum(HUDDLE_EXIT_RECEIPT_VERDICTS),
  repo: nonEmptyString,
  lane: nonEmptyString,
  source_ref: nonEmptyString,
  changed_files: z.array(nonEmptyString).default([]),
  validation: z.array(nonEmptyString).default([]),
  evidence: stringList.min(1),
  blockers: z.array(nonEmptyString).default([]),
  next_owner: nonEmptyString,
  refresh_after: nonEmptyString,
}).superRefine((receipt, ctx) => {
  if (looksLikeChatMemoryPath(receipt.source_ref)) {
    ctx.addIssue({
      code: 'custom',
      path: ['source_ref'],
      message: 'source_ref must point to a durable task packet, commit, issue, bus event, or repo-local receipt; not chat logs or transcripts',
    });
  }

  for (const [index, evidence] of receipt.evidence.entries()) {
    if (looksLikeChatMemoryPath(evidence)) {
      ctx.addIssue({
        code: 'custom',
        path: ['evidence', index],
        message: 'evidence must be repo-local or packet-local durable proof, not chat logs or transcripts',
      });
    }
  }

  if (receipt.verdict !== 'accept' && receipt.blockers.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['blockers'],
      message: 'counter and blocked receipts must name at least one blocker',
    });
  }
});

export type HuddleExitReceiptV1 = z.infer<typeof HuddleExitReceiptV1Schema>;

export const PortableExitReceiptV1Schema = z.object({
  schema_version: z.literal('exit-receipt.v1'),
  receipt_id: nonEmptyString,
  work_id: nonEmptyString,
  outcome: z.enum(PORTABLE_EXIT_RECEIPT_OUTCOMES),
  changed_files: z.array(nonEmptyString).default([]),
  validation: z.array(validationEntry).default([]),
  evidence_refs: stringList.min(1),
  stop_conditions: stringList.min(1),
  deferred_work: z.array(nonEmptyString).default([]),
  next_owner: nonEmptyString,
}).superRefine((receipt, ctx) => {
  for (const [index, evidence] of receipt.evidence_refs.entries()) {
    if (looksLikeChatMemoryPath(evidence)) {
      ctx.addIssue({
        code: 'custom',
        path: ['evidence_refs', index],
        message: 'evidence_refs must be durable proof, not chat logs or transcripts',
      });
    }
  }
});

export type PortableExitReceiptV1 = z.infer<typeof PortableExitReceiptV1Schema>;

export function parseHuddleCardV1(value: unknown): HuddleCardV1 {
  return HuddleCardV1Schema.parse(value);
}

export function validateHuddleCardV1(value: unknown): void {
  HuddleCardV1Schema.parse(value);
}

export function parseHuddleExitReceiptV1(value: unknown): HuddleExitReceiptV1 {
  return HuddleExitReceiptV1Schema.parse(value);
}

export function validateHuddleExitReceiptV1(value: unknown): void {
  HuddleExitReceiptV1Schema.parse(value);
}

export function parsePortableExitReceiptV1(value: unknown): PortableExitReceiptV1 {
  return PortableExitReceiptV1Schema.parse(value);
}

export function validatePortableExitReceiptV1(value: unknown): void {
  PortableExitReceiptV1Schema.parse(value);
}

function huddleVerdictToPortableOutcome(verdict: HuddleExitReceiptVerdict): PortableExitReceiptOutcome {
  if (verdict === 'accept') {
    return 'success';
  }
  if (verdict === 'counter') {
    return 'partial';
  }
  return 'blocked';
}

function portableOutcomeToHuddleVerdict(outcome: PortableExitReceiptOutcome): HuddleExitReceiptVerdict {
  if (outcome === 'success') {
    return 'accept';
  }
  if (outcome === 'partial') {
    return 'counter';
  }
  return 'blocked';
}

function renderValidationEntry(entry: PortableExitReceiptV1['validation'][number]): string {
  if (typeof entry === 'string') {
    return entry;
  }
  return `${entry.command} -> ${entry.result}`;
}

export function toPortableExitReceiptV1(
  receipt: HuddleExitReceiptV1,
  receiptId = `${receipt.task_id}-exit-receipt`,
): PortableExitReceiptV1 {
  return PortableExitReceiptV1Schema.parse({
    schema_version: 'exit-receipt.v1',
    receipt_id: receiptId,
    work_id: receipt.task_id,
    outcome: huddleVerdictToPortableOutcome(receipt.verdict),
    changed_files: receipt.changed_files,
    validation: receipt.validation,
    evidence_refs: [receipt.source_ref, ...receipt.evidence],
    stop_conditions: receipt.blockers.length > 0 ? receipt.blockers : ['none fired'],
    deferred_work: [],
    next_owner: receipt.next_owner,
  });
}

export function toHuddleExitReceiptV1(
  receipt: PortableExitReceiptV1,
  context: {
    repo: string;
    lane: string;
    source_ref?: string;
    refresh_after?: string;
  },
): HuddleExitReceiptV1 {
  const blockers = receipt.outcome === 'success'
    ? []
    : [...receipt.stop_conditions, ...receipt.deferred_work].filter((entry) => entry !== 'none fired');

  return HuddleExitReceiptV1Schema.parse({
    schema_version: 'huddle-exit-receipt.v1',
    task_id: receipt.work_id,
    verdict: portableOutcomeToHuddleVerdict(receipt.outcome),
    repo: context.repo,
    lane: context.lane,
    source_ref: context.source_ref ?? receipt.evidence_refs[0],
    changed_files: receipt.changed_files,
    validation: receipt.validation.map(renderValidationEntry),
    evidence: receipt.evidence_refs,
    blockers,
    next_owner: receipt.next_owner,
    refresh_after: context.refresh_after ?? 'after repo-local state changes',
  });
}
