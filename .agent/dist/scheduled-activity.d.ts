import { type ScheduleMode } from "./schedule-policy.js";
export interface PushOptions {
    remote?: string;
    token?: string;
    repo?: string;
}
export interface ScheduledActivityGateInput {
    eventName: string;
    schedulePolicy: string;
    workflow: string;
    activityCount?: string;
    dependencyRef?: string;
    dependencyField?: string;
    selfRef?: string;
    selfField?: string;
    cwd?: string;
    pushOptions?: PushOptions;
}
export interface ScheduledActivityGateResult {
    skip: boolean;
    mode: ScheduleMode;
    reason: string;
    dependencyValue: string;
    selfValue: string;
}
export declare function resolveCursorActivity(mode: ScheduleMode, dependencyValue: string, selfValue: string): ScheduledActivityGateResult;
export declare function fetchJsonState(ref: string, cwd: string, opts?: PushOptions): Record<string, unknown> | null;
export declare function writeJsonState(ref: string, state: Record<string, unknown>, cwd: string, opts?: PushOptions): void;
export declare function resolveScheduledActivityGate(input: ScheduledActivityGateInput): ScheduledActivityGateResult;
//# sourceMappingURL=scheduled-activity.d.ts.map