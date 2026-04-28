import type { SessionEnsureOutcome, SessionIdentity } from "./acpx-adapter.js";
import type { SessionPolicy } from "./session-policy.js";
import type { ThreadResumeStatus, ThreadState } from "./thread-state.js";
export interface ThreadResumeFields {
    resume_status: ThreadResumeStatus;
    last_resume_error: string;
    resumed_from_session_id: string;
}
export declare function resumeSessionIdFromState(policy: SessionPolicy, state: ThreadState | null): string | undefined;
export declare function resumeSessionIdFromForkSource(policy: SessionPolicy, existingState: ThreadState | null, forkAcpxSessionId: string | undefined): string | undefined;
export declare function shouldUseContinuationPrompt(existingState: ThreadState | null, resumeSessionId: string | undefined): boolean;
export declare function buildRunningThreadStateFields(): ThreadResumeFields;
export declare function buildThreadStateFieldsFromEnsureOutcome(outcome: SessionEnsureOutcome): ThreadResumeFields;
export declare function buildCompletedThreadStateUpdates(args: {
    outcome: SessionEnsureOutcome;
    identity: SessionIdentity | null;
}): Partial<ThreadState>;
export declare function buildFailedThreadStateUpdates(outcome: SessionEnsureOutcome): Partial<ThreadState>;
export declare function shouldFailRunBecauseOfEnsureOutcome(policy: SessionPolicy, outcome: SessionEnsureOutcome): boolean;
export declare function shouldFailRunBecauseOfThreadStateError(policy: SessionPolicy): boolean;
export declare function shouldFailBecauseRequiredResumeIdentityMissing(policy: SessionPolicy, existingState: ThreadState | null, resumeSessionId: string | undefined): boolean;
//# sourceMappingURL=runtime-state.d.ts.map