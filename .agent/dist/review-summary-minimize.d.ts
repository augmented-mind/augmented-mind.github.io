import { type GraphQLClient } from "./github-graphql.js";
type CollapsePreviousReviewSummariesOptions = {
    repo: string;
    prNumber: number;
    client?: GraphQLClient;
};
/**
 * Collapses older agent-generated PR review summaries before posting a fresh one.
 */
export declare function collapsePreviousReviewSummaries(options: CollapsePreviousReviewSummariesOptions): number;
export {};
//# sourceMappingURL=review-summary-minimize.d.ts.map