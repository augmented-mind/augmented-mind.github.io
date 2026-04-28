#!/usr/bin/env node
import { type GraphQLClient } from "../../github-graphql.js";
interface WritableLike {
    write(chunk: string): void;
}
interface DiscussionNode {
    number: number;
    updatedAt?: string | null;
}
export declare function buildGhApiPagedArgs(endpoint: string, params: Array<[string, string]>): string[];
export declare function hasDiscussionsEnabled(client: GraphQLClient, owner: string, repo: string): boolean;
export declare function fetchDiscussions(client: GraphQLClient, owner: string, repo: string, since: string): DiscussionNode[];
export declare function fetchDiscussionDetail(client: GraphQLClient, owner: string, repo: string, number: number): unknown;
export declare function runSyncGithubArtifactsCli(argv: string[], options?: {
    env?: NodeJS.ProcessEnv;
    stdout?: WritableLike;
    stderr?: WritableLike;
    graphqlClient?: GraphQLClient;
}): number;
export {};
//# sourceMappingURL=sync-github-artifacts.d.ts.map