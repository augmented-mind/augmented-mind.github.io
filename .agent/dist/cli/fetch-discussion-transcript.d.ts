#!/usr/bin/env node
import { buildDiscussionTranscript, fetchDiscussionTranscript } from "../discussion-transcript.js";
import { type GraphQLClient } from "../github-graphql.js";
type ExecGh = (file: string, args: readonly string[], options: {
    stdio: ["pipe", "pipe", "pipe"];
    maxBuffer: number;
}) => string | Buffer;
interface WritableLike {
    write(chunk: string): void;
}
/**
 * Resolves the current repository slug from the environment or `gh repo view`.
 */
export declare function resolveRepoSlug(options?: {
    env?: NodeJS.ProcessEnv;
    execGh?: ExecGh;
}): string;
/**
 * Parses the discussion number argument.
 */
export declare function parseDiscussionNumber(value: string | undefined): number | null;
export declare function runFetchDiscussionTranscriptCli(argv: string[], options?: {
    env?: NodeJS.ProcessEnv;
    stdout?: WritableLike;
    stderr?: WritableLike;
    resolveRepoSlug?: (options?: {
        env?: NodeJS.ProcessEnv;
        execGh?: ExecGh;
    }) => string;
    createClient?: () => GraphQLClient;
    fetchDiscussionTranscript?: typeof fetchDiscussionTranscript;
    buildDiscussionTranscript?: typeof buildDiscussionTranscript;
}): number;
export {};
//# sourceMappingURL=fetch-discussion-transcript.d.ts.map