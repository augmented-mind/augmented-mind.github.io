export interface ResponseTarget {
    /** "issue_comment" | "review_comment_reply" | "discussion_comment" */
    responseKind: string;
    /** Issue, PR, or discussion number */
    targetNumber: number;
    /** PR review comment ID (for review_comment_reply) */
    reviewCommentId?: number;
    /** Discussion GraphQL node ID (for discussion_comment) */
    discussionNodeId?: string;
    /** Optional reply-to node ID for threaded discussion replies */
    replyToId?: string;
    /** Repository slug (owner/repo) — used for review comment replies */
    repo?: string;
}
/**
 * Posts a response to the correct GitHub surface based on responseKind.
 */
export declare function postResponse(target: ResponseTarget, body: string): void;
//# sourceMappingURL=respond.d.ts.map