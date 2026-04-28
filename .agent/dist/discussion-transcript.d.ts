import type { GraphQLClient } from "./github-graphql.js";
/**
 * Summary metadata for the discussion body shown at the top of the transcript.
 */
export interface DiscussionTranscriptMeta {
    id: string;
    title: string;
    url: string;
    body: string;
    author: string;
}
/**
 * A reply entry in the discussion transcript.
 */
export interface DiscussionTranscriptReply {
    id: string;
    body: string;
    createdAt: string;
    author: string;
    replyToId: string;
}
/**
 * A top-level discussion comment with any nested replies.
 */
export interface DiscussionTranscriptComment extends DiscussionTranscriptReply {
    replies: DiscussionTranscriptReply[];
}
/**
 * Fetches the full discussion transcript, including paginated comments and replies.
 */
export declare function fetchDiscussionTranscript(github: GraphQLClient, owner: string, repo: string, number: number): {
    discussionMeta: DiscussionTranscriptMeta;
    comments: DiscussionTranscriptComment[];
};
/**
 * Builds the markdown transcript consumed by the agent prompt.
 */
export declare function buildDiscussionTranscript(discussionMeta: DiscussionTranscriptMeta, comments: DiscussionTranscriptComment[]): string;
/**
 * Formats a top-level comment or nested reply for the transcript body.
 */
export declare function formatDiscussionTranscriptComment(comment: DiscussionTranscriptReply, depth: number): string;
//# sourceMappingURL=discussion-transcript.d.ts.map