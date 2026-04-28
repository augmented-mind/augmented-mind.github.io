export declare const THREAD_STATE_SCHEMA_VERSION = 3;
export type ThreadStatus = "pending" | "running" | "completed" | "failed";
export type ThreadResumeStatus = "not_attempted" | "resumed" | "fallback_fresh" | "failed";
export type ThreadBundleRestoreStatus = "not_attempted" | "not_available" | "restored" | "restored_from_fork" | "failed";
export interface ThreadState {
    schema_version: number;
    thread_key: string;
    acpxRecordId: string;
    acpxSessionId: string;
    agentSessionId: string;
    branch: string;
    status: ThreadStatus;
    resume_status: ThreadResumeStatus;
    last_resume_error: string;
    resumed_from_session_id: string;
    session_bundle_backend: string;
    session_bundle_artifact_id: string;
    session_bundle_artifact_name: string;
    session_bundle_run_id: string;
    bundle_restore_status: ThreadBundleRestoreStatus;
    last_bundle_restore_error: string;
    forked_from_thread_key: string;
    forked_from_acpx_session_id: string;
    last_run_url: string;
    last_comment_url: string;
    attempt_count: number;
    created_at: string;
    updated_at: string;
}
export declare function createThreadState(threadKey: string): ThreadState;
export declare function updateThreadState(state: ThreadState, updates: Partial<ThreadState>): ThreadState;
/**
 * Normalizes persisted thread state, including legacy pre-schema-v3 data.
 * Legacy `status: "resume_failed"` is upgraded to:
 * - `status: "failed"`
 * - `resume_status: "failed"`
 */
export declare function normalizeThreadState(raw: unknown, fallbackThreadKey?: string): ThreadState | null;
/**
 * Converts a thread_key into a safe, injective ref path component.
 * thread_key format: owner/repo:target_kind:target_number:route:lane
 *
 * Uses percent-encoding for `/` and `%` to guarantee the mapping is
 * reversible — distinct thread keys always produce distinct ref names.
 * `:` is replaced with `--` (safe since `--` cannot appear in any
 * individual field value).
 */
export declare function threadKeyToRefName(threadKey: string): string;
export declare function refPathForThreadKey(threadKey: string): string;
export declare function fetchThreadState(threadKey: string, cwd: string, opts?: PushOptions): ThreadState | null;
export interface PushOptions {
    remote?: string;
    token?: string;
    repo?: string;
}
export declare function writeThreadState(threadKey: string, state: ThreadState, cwd: string, opts?: PushOptions): void;
export declare function getThreadState(threadKey: string, cwd: string, opts?: PushOptions): ThreadState | null;
export interface ThreadStateRunningUpdates {
    last_run_url?: string;
    branch?: string;
    resume_status?: ThreadResumeStatus;
    last_resume_error?: string;
    resumed_from_session_id?: string;
    forked_from_thread_key?: string;
    forked_from_acpx_session_id?: string;
    bundle_restore_status?: ThreadBundleRestoreStatus;
    last_bundle_restore_error?: string;
}
export declare function markThreadRunning(threadKey: string, cwd: string, updates: ThreadStateRunningUpdates, opts?: PushOptions): ThreadState;
export interface ThreadStateCompletionUpdates {
    acpxRecordId?: string;
    acpxSessionId?: string;
    agentSessionId?: string;
    branch?: string;
    last_comment_url?: string;
    resume_status?: ThreadResumeStatus;
    last_resume_error?: string;
    resumed_from_session_id?: string;
}
export declare function markThreadCompleted(threadKey: string, state: ThreadState, cwd: string, updates: ThreadStateCompletionUpdates, opts?: PushOptions): ThreadState;
export interface ThreadStateFailureUpdates {
    last_comment_url?: string;
    resume_status?: ThreadResumeStatus;
    last_resume_error?: string;
    resumed_from_session_id?: string;
}
export declare function markThreadFailed(threadKey: string, state: ThreadState, cwd: string, updates: ThreadStateFailureUpdates, opts?: PushOptions): ThreadState;
export interface ThreadStateBundleRestoreUpdates {
    bundle_restore_status?: ThreadBundleRestoreStatus;
    last_bundle_restore_error?: string;
}
export declare function markThreadBundleRestore(threadKey: string, cwd: string, updates: ThreadStateBundleRestoreUpdates, opts?: PushOptions): ThreadState | null;
export interface ThreadStateBundleStoredUpdates {
    session_bundle_backend?: string;
    session_bundle_artifact_id?: string;
    session_bundle_artifact_name?: string;
    session_bundle_run_id?: string;
}
export declare function markThreadBundleStored(threadKey: string, cwd: string, updates: ThreadStateBundleStoredUpdates, opts?: PushOptions): ThreadState;
//# sourceMappingURL=thread-state.d.ts.map