/**
 * Run statuses for post-agent workflow steps.
 */
export type RunStatus = "success" | "no_changes" | "verify_failed" | "failed" | "unsupported";
/**
 * Determines the run status from agent exit code, change detection, and
 * verification result. This is the shared logic currently duplicated in
 * agent-implement.yml and agent-fix-pr.yml shell scripts.
 */
export declare function determineRunStatus(agentExitCode: number, hasChanges: boolean, verifyExitCode: number, hasBranchUpdate?: boolean): RunStatus;
export interface StatusCommentData {
    status: RunStatus;
    summary?: string;
    branch?: string;
    prUrl?: string;
    requestedBy?: string;
    approvalCommentUrl?: string;
}
export declare function formatImplementComment(data: StatusCommentData): string;
export declare function formatFixPrComment(data: StatusCommentData): string;
export declare function formatReviewComment(data: {
    synthesisBody: string;
    requestedBy?: string;
    approvalCommentUrl?: string;
}): string;
export declare function formatRubricsUpdateComment(data: {
    prNumber: string | number;
    rubricsRef: string;
    rubricsCommitted: boolean;
    runSucceeded: boolean;
    summary?: string;
}): string;
/**
 * Extracts the first balanced JSON object from model output.
 * Tolerates fenced wrappers and markdown code fences inside string values.
 */
export declare function extractJsonObject(raw: string): string;
export interface ImplementationResponse {
    summary: string;
    commitMessage: string;
    prTitle: string;
    prBody: string;
}
export declare function summaryFromAgentResponse(route: string, raw: string): string;
export declare function normalizeImplementationResponse(raw: string): ImplementationResponse;
//# sourceMappingURL=response.d.ts.map