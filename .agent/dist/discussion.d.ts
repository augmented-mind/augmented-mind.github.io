import { type GraphQLClient } from "./github-graphql.js";
export interface DiscussionComment {
    id: string;
    body: string;
    created_at: string;
}
export interface DiscussionCategory {
    id: string;
    name: string;
}
export interface RepositoryDiscussionConfig {
    repositoryId: string;
    hasDiscussionsEnabled: boolean;
    categories: DiscussionCategory[];
}
/**
 * Resolves the reply-to target for a discussion comment.
 * Returns the parent comment node ID if the comment is a nested reply,
 * or the comment's own ID if it's a top-level reply.
 */
export declare function resolveDiscussionReplyTo(commentNodeId: string): string;
/**
 * Fetches all comments for a discussion with cursor-based pagination.
 * Returns flattened list suitable for findLatestPendingRequest scanning.
 */
export declare function fetchDiscussionComments(owner: string, repo: string, number: number): DiscussionComment[];
/**
 * Updates an existing discussion comment body.
 */
export declare function updateDiscussionComment(commentId: string, body: string): void;
/**
 * Fetches repository discussion settings and all visible discussion categories.
 */
export declare function fetchRepositoryDiscussionConfig(client: GraphQLClient, owner: string, repo: string): RepositoryDiscussionConfig;
export declare function requireDiscussionCategory(config: RepositoryDiscussionConfig, categoryName: string): DiscussionCategory;
export declare function createDiscussion(client: GraphQLClient, repoId: string, categoryId: string, title: string, body: string): {
    url: string;
};
export declare function createRepositoryDiscussion(owner: string, repo: string, categoryName: string, title: string, body: string, client?: GraphQLClient): {
    url: string;
};
//# sourceMappingURL=discussion.d.ts.map