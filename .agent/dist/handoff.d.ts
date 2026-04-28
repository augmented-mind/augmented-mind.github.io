export type AgentAction = "implement" | "review" | "fix-pr";
export type HandoffDecisionKind = "dispatch" | "stop" | "skip";
export type AutomationMode = "disabled" | "heuristics" | "agent";
export type HandoffMarkerState = "pending" | "dispatched" | "failed";
export type PlannerDecisionKind = "handoff" | "stop" | "blocked";
export interface HandoffInput {
    automationMode: string;
    sourceAction: string;
    sourceConclusion: string;
    targetNumber: string;
    nextTargetNumber?: string;
    currentRound: number;
    maxRounds: number;
    plannerDecision?: PlannerDecision | null;
}
export interface HandoffDecision {
    decision: HandoffDecisionKind;
    nextAction?: AgentAction;
    targetNumber?: string;
    reason: string;
    nextRound: number;
    handoffContext?: string;
}
export interface HandoffDedupeInput {
    repo: string;
    sourceRunId: string;
    sourceAction: string;
    sourceTargetNumber: string;
    nextAction: string;
    nextTargetNumber: string;
    nextRound: number;
}
export interface HandoffMarkerInfo {
    state: HandoffMarkerState;
    createdAtMs: number | null;
}
export interface PlannerDecision {
    decision: PlannerDecisionKind;
    nextAction?: AgentAction;
    reason: string;
    handoffContext?: string;
}
export declare function normalizeAutomationMode(value: string): AutomationMode;
export declare function automationModeAllowsHandoff(value: string): boolean;
export declare function normalizeConclusion(value: string): string;
export declare function parsePlannerDecision(raw: string): PlannerDecision | null;
export declare function extractReviewConclusion(markdown: string): string;
export declare function buildHandoffDedupeKey(input: HandoffDedupeInput): string;
export declare function buildHandoffMarker(key: string, state?: HandoffMarkerState, createdAtMs?: number): string;
export declare function parseHandoffMarker(body: string, key: string): HandoffMarkerInfo | null;
export declare function getHandoffMarkerState(body: string, key: string): HandoffMarkerState | null;
export declare function hasHandoffMarker(body: string, key: string): boolean;
export declare function isPendingHandoffMarkerStale(marker: HandoffMarkerInfo, nowMs: number, ttlMs: number): boolean;
export declare function formatHandoffMarkerComment(args: {
    key: string;
    state?: HandoffMarkerState;
    sourceAction: string;
    nextAction: string;
    nextRound: number;
    maxRounds: number;
    reason: string;
    error?: string;
    createdAtMs?: number;
}): string;
export declare function decideHandoff(input: HandoffInput): HandoffDecision;
//# sourceMappingURL=handoff.d.ts.map