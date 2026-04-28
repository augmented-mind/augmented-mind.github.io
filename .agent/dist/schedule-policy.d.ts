export declare const SCHEDULE_MODES: readonly ["always_run", "skip_no_updates", "disabled"];
export type ScheduleMode = typeof SCHEDULE_MODES[number];
export declare const DEFAULT_SCHEDULE_MODE: ScheduleMode;
export declare const DEFAULT_SCHEDULE_WORKFLOW_OVERRIDES: Record<string, ScheduleMode>;
export interface SchedulePolicy {
    defaultMode: ScheduleMode;
    workflowOverrides: Record<string, ScheduleMode>;
}
export declare function parseSchedulePolicy(raw: string): SchedulePolicy;
export declare function getScheduleModeForWorkflow(policy: SchedulePolicy, workflow: string): ScheduleMode;
export declare function isScheduleMode(value: unknown): value is ScheduleMode;
//# sourceMappingURL=schedule-policy.d.ts.map