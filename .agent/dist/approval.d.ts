export interface PendingApproval {
    comment: {
        id: string | number;
        body: string;
        created_at: string;
    };
    request: Record<string, unknown>;
}
export interface ApprovalCommand {
    requestId: string;
}
/**
 * Encodes workflow dispatch metadata into a hidden HTML marker inside a comment.
 */
export declare function buildApprovalRequestMarker(data: Record<string, unknown>): string;
/**
 * Parses the hidden approval marker from a comment body when present.
 */
export declare function parseApprovalRequestMarker(body: string): Record<string, unknown> | null;
/**
 * Reports whether the approval-request comment has already been resolved.
 */
export declare function isApprovalRequestAlreadySatisfied(body: string): boolean;
/**
 * Reports whether a comment is an agent-managed approval request/status comment.
 */
export declare function isAgentApprovalComment(body: string): boolean;
/**
 * Appends a human-readable approval note and a hidden satisfied marker.
 */
export declare function markApprovalRequestSatisfied(body: string, approver: string, extra?: {
    route?: string;
    workflow?: string;
    issueUrl?: string;
    runUrl?: string;
}): string;
/**
 * Matches explicit approval commands understood by the portal.
 */
export declare function isApprovalCommand(body: string, mention?: string): boolean;
/**
 * Parses an approval command and extracts the referenced request ID.
 */
export declare function parseApprovalCommand(body: string, mention?: string): ApprovalCommand | null;
/**
 * Finds a specific unresolved approval request comment by request ID.
 */
export declare function findPendingRequestById(comments: Array<{
    id?: string | number;
    body?: string;
    created_at?: string;
}>, requestId: string): PendingApproval | null;
/**
 * Reports whether approving this request requires creating a new tracking
 * issue first. Implementation-like requests from non-issue surfaces should do that.
 */
export declare function shouldCreateIssueFromApprovalRequest(request: Record<string, unknown>): boolean;
//# sourceMappingURL=approval.d.ts.map