export interface AcpxRunOptions {
    /** The agent to use (e.g., "codex", "claude") */
    agent: string;
    /** The prompt text */
    prompt: string;
    /** Smaller prompt for a successfully resumed destination session. */
    continuationPrompt?: string;
    /** Working directory for the acpx process */
    cwd: string;
    /** Explicit execution mode: one-shot exec or persistent named session */
    sessionMode: "exec" | "persistent";
    /** Thread key for session naming (persistent lanes only) */
    threadKey?: string;
    /** Permission mode override */
    permissionMode?: "approve-all" | "approve-reads" | "deny-all";
    /** Timeout in seconds */
    timeout?: number;
    /** Optional session thought level for persistent lanes */
    thoughtLevel?: string;
    /** Prior ACP session ID to resume (when workflow opts in) */
    resumeSessionId?: string;
    /** Extra environment variables */
    env?: Record<string, string>;
}
export type PermissionMode = "approve-all" | "approve-reads" | "deny-all";
export type SessionEnsureOutcome = {
    kind: "not_applicable";
} | {
    kind: "fresh";
} | {
    kind: "resumed";
    resumedFromSessionId: string;
} | {
    kind: "resume_fallback";
    resumedFromSessionId: string;
    error: string;
} | {
    kind: "failed";
    error: string;
    resumedFromSessionId?: string;
};
export interface AcpxRunResult {
    exitCode: number;
    /** Final assistant message extracted from the session */
    stdout: string;
    /** Raw acpx stdout (typically NDJSON) */
    rawStdout: string;
    stderr: string;
    /** Compacted session log (merged tokens, structured events) */
    sessionLog: string;
    sessionName?: string;
    /** Structured outcome of session ensure/resume before the run */
    sessionEnsureOutcome: SessionEnsureOutcome;
}
export interface PreflightResult {
    ok: boolean;
    missing: string[];
}
export interface SessionIdentity {
    acpxRecordId: string;
    acpxSessionId: string;
}
export interface SessionIdentityReadResult {
    identity: SessionIdentity | null;
    error: string;
}
export interface FileCaptureRunOptions {
    command: string;
    args: string[];
    cwd: string;
    env?: NodeJS.ProcessEnv;
    /** Timeout in seconds */
    timeout?: number;
}
export interface FileCaptureRunResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}
/**
 * Runs a command synchronously while streaming stdout/stderr to temp files.
 *
 * This avoids the `execFileSync` maxBuffer cap for large agent/tool output,
 * but still returns the captured text to the caller after the process exits.
 */
export declare function runCommandWithFileCapture(options: FileCaptureRunOptions): FileCaptureRunResult;
/**
 * Verifies that required tools are available on the runner.
 */
export declare function preflight(): PreflightResult;
/**
 * Converts a thread key into a safe acpx session name.
 * acpx session names should be short, filesystem-safe identifiers.
 */
export declare function sessionNameFromThreadKey(threadKey: string): string;
export declare function buildAcpxArgs(options: {
    agent: string;
    prompt: string;
    permissionMode: PermissionMode;
    timeout?: number;
    sessionName?: string;
    isExecRoute: boolean;
}): string[];
export declare function parsePermissionModeOrSetDefault(value: string | undefined): PermissionMode;
export declare function selectPromptForSessionOutcome(options: {
    fullPrompt: string;
    continuationPrompt?: string;
    outcome: SessionEnsureOutcome;
}): string;
export interface SessionSetupCommand {
    label: string;
    args: string[];
}
export declare function buildSessionSetupCommands(options: {
    agent: string;
    sessionName?: string;
    thoughtLevel?: string;
    permissionMode?: PermissionMode;
}): SessionSetupCommand[];
export declare function parseSessionIdentity(raw: string): SessionIdentity | null;
/**
 * Extracts the final assistant message from a compacted session log.
 * Returns the last `message` entry — reasoning traces are in the JSONL.
 */
export declare function extractAssistantText(compactedLog: string): string;
/**
 * Compacts raw acpx NDJSON into a clean session log.
 *
 * - Merges streaming `agent_message_chunk` tokens into one entry per turn
 * - Keeps tool_call events (with name/status)
 * - Keeps usage_update events
 * - Extracts session metadata from the verbose init/session payloads
 * - Drops everything else (protocol handshake, model lists, etc.)
 */
export declare function compactSessionLog(ndjson: string): string;
/**
 * Formats a compacted session log for human-readable display in CI logs.
 * Message text is truncated to SESSION_LOG_MAX_MESSAGE_CHARS per entry.
 */
export declare function formatSessionLogForDisplay(sessionLog: string): string;
export declare function tailForLog(value: string, maxChars: number): string;
/**
 * Runs an acpx prompt and returns the result.
 *
 * CLI argv ordering: acpx [global-flags] <agent> <subcommand> [subcommand-args] [prompt]
 */
export declare function runAcpx(options: AcpxRunOptions): AcpxRunResult;
/**
 * Reads session metadata after a run to extract identity fields.
 * Returns acpxRecordId and acpxSessionId if available.
 */
export declare function readSessionIdentityResult(agent: string, sessionName: string, cwd: string): SessionIdentityReadResult;
//# sourceMappingURL=acpx-adapter.d.ts.map