import { z } from 'zod';
import {
  HUDDLE_CARD_MODES,
  HuddleCardV1Schema,
  HuddleExitReceiptV1Schema,
  type HuddleCardV1,
  type HuddleExitReceiptV1,
} from './huddle';

export const HUDDLE_BOARD_STATUSES = [
  'ready',
  'claimed',
  'in_progress',
  'waiting_return',
  'accepted',
  'blocked',
  'stale',
] as const;

export type HuddleBoardStatus = (typeof HUDDLE_BOARD_STATUSES)[number];

const nonEmptyString = z.string().trim().min(1);
export const HUDDLE_BOARD_GENERATED_NOTICE =
  'This is a read replica. Do not hand-edit; update source cards or receipts and regenerate.' as const;

export const HuddleBoardItemV1Schema = z.object({
  key: nonEmptyString,
  repo: nonEmptyString,
  lane: nonEmptyString,
  task_id: nonEmptyString,
  mode: z.enum(HUDDLE_CARD_MODES),
  status: z.enum(HUDDLE_BOARD_STATUSES),
  card_status: z.enum(HUDDLE_BOARD_STATUSES),
  current_owner: nonEmptyString,
  next_owner: nonEmptyString,
  card_ref: nonEmptyString.optional(),
  receipt_ref: nonEmptyString.optional(),
  receipt_verdict: z.enum(['accept', 'counter', 'blocked']).optional(),
  stale_reason: nonEmptyString.optional(),
  evidence_refs: z.array(nonEmptyString).default([]),
});

export const HuddleBoardV1Schema = z.object({
  schema_version: z.literal('huddle-board.v1'),
  generated_notice: z.literal(HUDDLE_BOARD_GENERATED_NOTICE),
  generated_at: nonEmptyString,
  summary: z.record(z.enum(HUDDLE_BOARD_STATUSES), z.number().int().min(0)),
  items: z.array(HuddleBoardItemV1Schema),
});

export type HuddleBoardItemV1 = z.infer<typeof HuddleBoardItemV1Schema>;
export type HuddleBoardV1 = z.infer<typeof HuddleBoardV1Schema>;

function taskKey(repo: string, lane: string, taskId: string): string {
  return `${repo}::${lane}::${taskId}`;
}

function isExpired(value: string, now: Date): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed < now.getTime();
}

function emptySummary(): Record<HuddleBoardStatus, number> {
  return {
    ready: 0,
    claimed: 0,
    in_progress: 0,
    waiting_return: 0,
    accepted: 0,
    blocked: 0,
    stale: 0,
  };
}

export function buildHuddleBoardV1(input: {
  cards: Array<{ card: HuddleCardV1; ref?: string }>;
  receipts?: Array<{ receipt: HuddleExitReceiptV1; ref?: string }>;
  generated_at?: string;
  now?: Date;
}): HuddleBoardV1 {
  const now = input.now ?? new Date(input.generated_at ?? Date.now());
  const generatedAt = input.generated_at ?? now.toISOString();
  const receiptsByKey = new Map<string, { receipt: HuddleExitReceiptV1; ref?: string }>();

  for (const candidate of input.receipts ?? []) {
    const receipt = HuddleExitReceiptV1Schema.parse(candidate.receipt);
    receiptsByKey.set(taskKey(receipt.repo, receipt.lane, receipt.task_id), {
      receipt,
      ref: candidate.ref,
    });
  }

  const items: HuddleBoardItemV1[] = input.cards.map((candidate) => {
    const card = HuddleCardV1Schema.parse(candidate.card);
    const key = taskKey(card.repo, card.lane, card.task_id);
    const receiptRef = receiptsByKey.get(key);
    const expired = isExpired(card.expires_or_refresh_after, now);

    let status: HuddleBoardStatus = card.status;
    let staleReason: string | undefined;
    const evidenceRefs: string[] = [];

    if (receiptRef) {
      status = receiptRef.receipt.verdict === 'accept' ? 'accepted' : 'blocked';
      evidenceRefs.push(receiptRef.receipt.source_ref, ...receiptRef.receipt.evidence);
    } else if (expired && card.status !== 'accepted' && card.status !== 'blocked') {
      status = 'stale';
      staleReason = `expired after ${card.expires_or_refresh_after}`;
    }

    return HuddleBoardItemV1Schema.parse({
      key,
      repo: card.repo,
      lane: card.lane,
      task_id: card.task_id,
      mode: card.mode,
      status,
      card_status: card.status,
      current_owner: card.current_owner,
      next_owner: receiptRef?.receipt.next_owner ?? card.next_owner,
      card_ref: candidate.ref,
      receipt_ref: receiptRef?.ref,
      receipt_verdict: receiptRef?.receipt.verdict,
      stale_reason: staleReason,
      evidence_refs: evidenceRefs,
    });
  }).sort((left, right) => left.key.localeCompare(right.key));

  const summary = emptySummary();
  for (const item of items) {
    summary[item.status] += 1;
  }

  return HuddleBoardV1Schema.parse({
    schema_version: 'huddle-board.v1',
    generated_notice: HUDDLE_BOARD_GENERATED_NOTICE,
    generated_at: generatedAt,
    summary,
    items,
  });
}

export function stableHuddleBoardFingerprint(board: HuddleBoardV1): string {
  return JSON.stringify({
    schema_version: board.schema_version,
    generated_notice: board.generated_notice,
    summary: board.summary,
    items: board.items.map((item) => ({
      key: item.key,
      status: item.status,
      current_owner: item.current_owner,
      next_owner: item.next_owner,
      receipt_verdict: item.receipt_verdict,
      stale_reason: item.stale_reason,
    })),
  });
}
