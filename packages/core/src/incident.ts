import { z } from 'zod';

export const INCIDENT_SEVERITIES = ['sev0', 'sev1', 'sev2', 'sev3', 'sev4'] as const;
export const INCIDENT_STATUSES = ['detected', 'acknowledged', 'mitigating', 'resolved', 'closed'] as const;
export const INCIDENT_BUSINESS_CONTEXT_STATUSES = ['absent', 'partial', 'provided'] as const;
export const INCIDENT_ROOT_CAUSE_STATUSES = ['unknown', 'suspected', 'confirmed'] as const;
export const INCIDENT_FOLLOW_UP_STATUSES = ['open', 'deferred', 'done'] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type IncidentBusinessContextStatus = (typeof INCIDENT_BUSINESS_CONTEXT_STATUSES)[number];
export type IncidentRootCauseStatus = (typeof INCIDENT_ROOT_CAUSE_STATUSES)[number];
export type IncidentFollowUpStatus = (typeof INCIDENT_FOLLOW_UP_STATUSES)[number];

const nonEmptyString = z.string().trim().min(1);
const stringList = z.array(nonEmptyString);

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

function addEvidenceRefIssues(refs: string[], path: (string | number)[], ctx: z.RefinementCtx): void {
  for (const [index, ref] of refs.entries()) {
    if (looksLikeChatMemoryPath(ref)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index],
        message: 'incident evidence_refs must point to durable proof, not chat logs or transcripts',
      });
    }
  }
}

const IncidentBusinessContextV1Schema = z.object({
  customer_impact: nonEmptyString.optional(),
  sla_tier: nonEmptyString.optional(),
  revenue_exposure: nonEmptyString.optional(),
  compliance_implication: nonEmptyString.optional(),
}).default({});

const IncidentTimelineEventV1Schema = z.object({
  at: nonEmptyString,
  actor: nonEmptyString,
  action: nonEmptyString,
  evidence_refs: z.array(nonEmptyString).default([]),
});

const IncidentDecisionV1Schema = z.object({
  at: nonEmptyString,
  actor: nonEmptyString,
  decision: nonEmptyString,
  rationale: nonEmptyString,
  evidence_refs: z.array(nonEmptyString).default([]),
});

const IncidentFollowUpV1Schema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  owner: nonEmptyString,
  status: z.enum(INCIDENT_FOLLOW_UP_STATUSES),
  evidence_refs: z.array(nonEmptyString).default([]),
});

export const IncidentReceiptV1Schema = z.object({
  schema_version: z.literal('incident-receipt.v1'),
  incident_id: nonEmptyString,
  title: nonEmptyString,
  severity: z.enum(INCIDENT_SEVERITIES),
  severity_rationale: nonEmptyString.optional(),
  status: z.enum(INCIDENT_STATUSES),
  incident_class: nonEmptyString.optional(),
  started_at: nonEmptyString,
  detected_at: nonEmptyString,
  acknowledged_at: nonEmptyString.optional(),
  resolved_at: nonEmptyString.optional(),
  acknowledged_by: nonEmptyString.optional(),
  resolved_by: nonEmptyString.optional(),
  detection_source: nonEmptyString.optional(),
  notification_chain: z.array(nonEmptyString).default([]),
  affected_systems: stringList.min(1),
  symptoms: stringList.min(1),
  timeline: z.array(IncidentTimelineEventV1Schema).min(1),
  decisions: z.array(IncidentDecisionV1Schema).default([]),
  evidence_refs: stringList.min(1),
  mitigation: nonEmptyString.optional(),
  rollback_or_fix_refs: z.array(nonEmptyString).default([]),
  validation_refs: z.array(nonEmptyString).default([]),
  follow_ups: z.array(IncidentFollowUpV1Schema).default([]),
  business_context_status: z.enum(INCIDENT_BUSINESS_CONTEXT_STATUSES),
  business_context: IncidentBusinessContextV1Schema,
  root_cause_status: z.enum(INCIDENT_ROOT_CAUSE_STATUSES).default('unknown'),
  root_cause_evidence_refs: z.array(nonEmptyString).default([]),
  runbook_executed_ref: nonEmptyString.optional(),
}).superRefine((receipt, ctx) => {
  addEvidenceRefIssues(receipt.evidence_refs, ['evidence_refs'], ctx);
  addEvidenceRefIssues(receipt.rollback_or_fix_refs, ['rollback_or_fix_refs'], ctx);
  addEvidenceRefIssues(receipt.validation_refs, ['validation_refs'], ctx);
  addEvidenceRefIssues(receipt.root_cause_evidence_refs, ['root_cause_evidence_refs'], ctx);

  for (const [index, event] of receipt.timeline.entries()) {
    addEvidenceRefIssues(event.evidence_refs, ['timeline', index, 'evidence_refs'], ctx);
  }
  for (const [index, decision] of receipt.decisions.entries()) {
    addEvidenceRefIssues(decision.evidence_refs, ['decisions', index, 'evidence_refs'], ctx);
  }
  for (const [index, followUp] of receipt.follow_ups.entries()) {
    addEvidenceRefIssues(followUp.evidence_refs, ['follow_ups', index, 'evidence_refs'], ctx);
  }

  if (receipt.runbook_executed_ref && looksLikeChatMemoryPath(receipt.runbook_executed_ref)) {
    ctx.addIssue({
      code: 'custom',
      path: ['runbook_executed_ref'],
      message: 'runbook_executed_ref must point to a durable runbook receipt or proof ref',
    });
  }

  if (['resolved', 'closed'].includes(receipt.status)) {
    if (!receipt.resolved_at) {
      ctx.addIssue({
        code: 'custom',
        path: ['resolved_at'],
        message: 'resolved or closed incidents must include resolved_at',
      });
    }
    if (!receipt.resolved_by) {
      ctx.addIssue({
        code: 'custom',
        path: ['resolved_by'],
        message: 'resolved or closed incidents must include resolved_by',
      });
    }
  }

  if (receipt.root_cause_status === 'confirmed' && receipt.root_cause_evidence_refs.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['root_cause_evidence_refs'],
      message: 'confirmed root cause requires at least one root_cause_evidence_ref',
    });
  }

  const context = receipt.business_context;
  const contextValues = [
    context.customer_impact,
    context.sla_tier,
    context.revenue_exposure,
    context.compliance_implication,
  ].filter(Boolean);

  if (receipt.business_context_status === 'absent' && contextValues.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['business_context_status'],
      message: 'business_context_status absent cannot carry incident business context fields',
    });
  }

  if (receipt.business_context_status === 'provided' && contextValues.length < 4) {
    ctx.addIssue({
      code: 'custom',
      path: ['business_context'],
      message: 'provided business context requires customer_impact, sla_tier, revenue_exposure, and compliance_implication',
    });
  }
});

export type IncidentReceiptV1 = z.infer<typeof IncidentReceiptV1Schema>;

export const IncidentSummaryV1Schema = z.object({
  schema_version: z.literal('incident-summary.v1'),
  incident_id: nonEmptyString,
  status: z.enum(INCIDENT_STATUSES),
  severity: z.enum(INCIDENT_SEVERITIES),
  started_at: nonEmptyString,
  resolved_at: nonEmptyString.optional(),
  duration_minutes: z.number().int().min(0).optional(),
  affected_systems: stringList.min(1),
  primary_symptom: nonEmptyString,
  mitigation_summary: nonEmptyString.optional(),
  evidence_refs: stringList.min(1),
  follow_up_count: z.number().int().min(0),
  business_context_status: z.enum(INCIDENT_BUSINESS_CONTEXT_STATUSES),
  root_cause_status: z.enum(INCIDENT_ROOT_CAUSE_STATUSES),
}).superRefine((summary, ctx) => {
  addEvidenceRefIssues(summary.evidence_refs, ['evidence_refs'], ctx);
});

export type IncidentSummaryV1 = z.infer<typeof IncidentSummaryV1Schema>;

export function parseIncidentReceiptV1(value: unknown): IncidentReceiptV1 {
  return IncidentReceiptV1Schema.parse(value);
}

export function validateIncidentReceiptV1(value: unknown): void {
  IncidentReceiptV1Schema.parse(value);
}

export function parseIncidentSummaryV1(value: unknown): IncidentSummaryV1 {
  return IncidentSummaryV1Schema.parse(value);
}

export function validateIncidentSummaryV1(value: unknown): void {
  IncidentSummaryV1Schema.parse(value);
}

function durationMinutes(startedAt: string, resolvedAt?: string): number | undefined {
  if (!resolvedAt) return undefined;

  const startMs = Date.parse(startedAt);
  const resolvedMs = Date.parse(resolvedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(resolvedMs) || resolvedMs < startMs) {
    return undefined;
  }

  return Math.round((resolvedMs - startMs) / 60000);
}

export function toIncidentSummaryV1(receipt: IncidentReceiptV1): IncidentSummaryV1 {
  const parsed = IncidentReceiptV1Schema.parse(receipt);

  return IncidentSummaryV1Schema.parse({
    schema_version: 'incident-summary.v1',
    incident_id: parsed.incident_id,
    status: parsed.status,
    severity: parsed.severity,
    started_at: parsed.started_at,
    resolved_at: parsed.resolved_at,
    duration_minutes: durationMinutes(parsed.started_at, parsed.resolved_at),
    affected_systems: parsed.affected_systems,
    primary_symptom: parsed.symptoms[0],
    mitigation_summary: parsed.mitigation,
    evidence_refs: [
      ...parsed.evidence_refs,
      ...parsed.rollback_or_fix_refs,
      ...parsed.validation_refs,
      ...parsed.root_cause_evidence_refs,
    ],
    follow_up_count: parsed.follow_ups.length,
    business_context_status: parsed.business_context_status,
    root_cause_status: parsed.root_cause_status,
  });
}
