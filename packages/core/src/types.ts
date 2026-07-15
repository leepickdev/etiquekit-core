export const SLICE_STATES = [
  'draft',
  'planned',
  'split',
  'assigned',
  'in_progress',
  'integration',
  'validated',
  'closed',
] as const;

export const TASK_STATES = [
  'incoming',
  'claimed',
  'in_progress',
  'evidence_ready',
  'accepted',
  'countered',
  'blocked',
  'resolved',
] as const;

export const PACKET_STATES = ['PROPOSED', 'ACCEPTED', 'LOCKED', 'PROVISIONED'] as const;
export const SCRUTINY_STATES = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DEFERRED', 'RESOLVED', 'VERIFIED', 'WONT_FIX'] as const;
export const SCRUTINY_KINDS = ['issue', 'feature', 'feature_set', 'readiness_gate', 'dependency', 'risk', 'research', 'decision', 'migration', 'cleanup'] as const;
export const ACTOR_KINDS = ['owner', 'worker', 'secretary', 'integrator', 'reviewer'] as const;

export type SliceState = (typeof SLICE_STATES)[number];
export type TaskState = (typeof TASK_STATES)[number];
export type PacketState = (typeof PACKET_STATES)[number];
export type ScrutinyState = (typeof SCRUTINY_STATES)[number];
export type ScrutinyKind = (typeof SCRUTINY_KINDS)[number];
export type ActorKind = (typeof ACTOR_KINDS)[number];

export interface Actor {
  actorId: string;
  kind: ActorKind;
  displayName: string;
}

export interface Dependency {
  taskId: string;
  kind: 'blocked-by' | 'depends-on';
}

export interface StateTransition {
  state: string;
  actorId: string;
  at: string;
  note?: string;
}

export interface EvidenceItem {
  kind: 'report' | 'receipt' | 'sample' | 'artifact' | 'note';
  path: string;
  summary: string;
}

export interface EvidenceBundle {
  bundleId: string;
  taskId: string;
  status: 'pending' | 'ready' | 'accepted';
  items: EvidenceItem[];
}

export interface Verdict {
  verdictId: string;
  sliceId: string;
  taskId?: string;
  outcome: 'accepted' | 'countered' | 'blocked' | 'completed';
  by: string;
  at: string;
  note?: string;
}

export interface SliceStatusSnapshot {
  sliceId: string;
  sliceState: SliceState;
  scrutinyState: ScrutinyState;
  packetStates: Record<PacketState, number>;
  taskStates: Record<TaskState, number>;
  unresolvedTasks: string[];
  readyToClose: boolean;
  blockers: string[];
}

// ============================================================================
// Supervision (Phase 1)
// Authority: etiquette/internal/docs/supervision/PHASE1.md
// Doctrine: llm-substrate/governance/shared-live-supervision.md
// ============================================================================

export const SESSION_STATUSES = [
  'running',
  'paused',
  'blocked',
  'awaiting_human',
  'closed',
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const TURN_STATUSES = ['open', 'closed'] as const;
export type TurnStatus = (typeof TURN_STATUSES)[number];

export const TURN_RESULTS = [
  'done',
  'blocked',
  'handed_off',
  'stopped',
  'timed_out',
] as const;
export type TurnResult = (typeof TURN_RESULTS)[number];

export const SUPERVISION_COMMANDS = [
  'status',
  'pause',
  'resume',
  'stop',
  'approve_next_turn',
  'redirect_owner',
  'request_summary',
  'mark_blocked',
  'escalate_to_human',
] as const;
export type SupervisionCommand = (typeof SUPERVISION_COMMANDS)[number];

export const COMMAND_STATUSES = [
  'queued',
  'applied',
  'rejected',
  'expired',
] as const;
export type CommandStatus = (typeof COMMAND_STATUSES)[number];

export const ACTION_CLASSES = [
  'coordination_only',
  'read_only_local',
  'bounded_verification',
  'bounded_product_mutation',
  'human_only',
] as const;
export type ActionClass = (typeof ACTION_CLASSES)[number];

export const ALLOWED_COMMAND_IDS = [
  'inspect_repo',
  'run_verify',
  'write_projection',
  'append_evidence',
  'write_product_files',
  'launch_runtime_target',
] as const;
export type AllowedCommandId = (typeof ALLOWED_COMMAND_IDS)[number];

export const PROJECTION_POLICIES = [
  'on_state_change',
  'on_command_only',
] as const;
export type ProjectionPolicy = (typeof PROJECTION_POLICIES)[number];

export const SUPERVISION_EVENT_TYPES = [
  'session.opened',
  'session.status_changed',
  'session.next_owner_changed',
  'turn.opened',
  'turn.closed',
  'command.queued',
  'command.applied',
  'command.rejected',
  'projection.rendered',
  'rebuild.completed',
] as const;
export type SupervisionEventType = (typeof SUPERVISION_EVENT_TYPES)[number];

export const RUNTIME_KINDS = [
  'codex',
  'claude-code',
  'human-mobile',
  'human-desktop',
  'other',
] as const;
export type RuntimeKind = (typeof RUNTIME_KINDS)[number];

export type SupervisionAudience =
  | 'all'
  | 'lead'
  | 'responder'
  | 'escalation_owner'
  | `seat:${string}`;

export interface SupervisionSession {
  sessionId: string;
  campaignRoot: string;
  topic: string;
  objective: string;
  status: SessionStatus;
  leadSeat: string;
  responderSeat: string;
  escalationOwner: string;
  timeCapMinutes: number;
  turnCap: number;
  currentTurnId: string | null;
  nextOwnerHint: string | null;
  approvedNextTurnJson: string | null;
  lastBlockerJson: string | null;
  sourceRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SupervisionTurn {
  turnId: string;
  sessionId: string;
  sequenceNo: number;
  status: TurnStatus;
  ownerSeat: string;
  allowedActionClass: ActionClass;
  maxDurationMinutes: number;
  allowedCommands: AllowedCommandId[];
  repoRoots: string[];
  ownedPaths: string[];
  forbiddenPaths: string[];
  verifyCommands: string[];
  requiresHumanApproval: boolean;
  projectionPolicy: ProjectionPolicy;
  startedAt: string;
  endedAt: string | null;
  result: TurnResult | null;
  summary: string | null;
  evidenceRefs: string[];
}

export interface SupervisionCommandRecord {
  commandId: string;
  sessionId: string;
  turnId: string | null;
  issuedBy: string;
  command: SupervisionCommand;
  payloadJson: string;
  status: CommandStatus;
  issuedAt: string;
  appliedAt: string | null;
  rejectionReason: string | null;
}

export interface SupervisionEvent {
  eventId: string;
  sessionId: string;
  turnId: string | null;
  commandId: string | null;
  eventType: SupervisionEventType;
  actor: string;
  audience: SupervisionAudience;
  at: string;
  payload: unknown;
}

export interface SeatCapabilityManifest {
  schemaVersion: 'discipline-supervision-seat-capabilities.v1';
  seatId: string;
  displayName: string;
  runtimeKind: RuntimeKind;
  canReadHandshake: boolean;
  canWriteHandshake: boolean;
  canReadProductRepo: boolean;
  canRunBuilds: boolean;
  canWriteProductRepo: boolean;
  canLaunchRuntimeTargets: boolean;
  canAcceptMobileSteering: boolean;
  allowedActionClasses: ActionClass[];
  defaultRequiresHumanApprovalForProductMutation: boolean;
  updatedAt: string;
}

export interface SupervisionProjection {
  sessionId: string;
  renderedAt: string;
  sessionSnapshot: SupervisionSession;
  currentTurn: SupervisionTurn | null;
  pendingCommands: SupervisionCommandRecord[];
}

// Payload shape for session.approvedNextTurnJson (serialized as canonical JSON string).
export interface ApprovedNextTurnPayload {
  ownerSeat: string;
  allowedActionClass: ActionClass;
  maxDurationMinutes: number;
  allowedCommands: AllowedCommandId[];
  repoRoots: string[];
  ownedPaths: string[];
  forbiddenPaths: string[];
  verifyCommands: string[];
  requiresHumanApproval: boolean;
  projectionPolicy: ProjectionPolicy;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string | null;
}

// Payload shape for session.lastBlockerJson (serialized as canonical JSON string).
export interface BlockerPayload {
  reason: string;
  raisedBy: string;
  raisedAt: string;
  escalationOwner: string;
  evidenceRefs: string[];
}
