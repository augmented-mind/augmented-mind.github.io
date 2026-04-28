/**
 * Runs a git command synchronously and returns trimmed stdout.
 * Accepts optional stdin input for commands like `hash-object --stdin`
 * and `mktree`.
 */
export declare function git(args: string[], cwd: string, input?: string): string;
/**
 * Builds an authenticated HTTPS remote URL for pushing.
 * Used by branch push helpers and thread-state ref pushes.
 */
export declare function buildAuthUrl(token: string, repo: string): string;
export declare function configureBotIdentity(cwd: string, name?: string, email?: string): void;
export declare function createBranch(baseBranch: string, branchName: string, cwd: string): void;
export declare function hasChanges(cwd: string): boolean;
export declare function currentHead(cwd: string): string;
export declare function hasHeadChanged(originalHead: string, cwd: string): boolean;
export declare function hasStagedChanges(cwd: string): boolean;
export declare function stageAll(cwd: string): void;
export declare function commit(message: string, cwd: string): void;
export declare function pushBranch(branch: string, token: string, repo: string, cwd: string, opts?: {
    setUpstream?: boolean;
}): void;
export declare function buildPushToRefArgs(remoteUrl: string, headRef: string, opts?: {
    forceWithLeaseOid?: string;
}): string[];
export declare function pushToRef(headRef: string, token: string, repo: string, cwd: string, opts?: {
    forceWithLeaseOid?: string;
}): void;
export declare function cleanupBranch(branchName: string, baseBranch: string, cwd: string): void;
export declare function cleanupWorktree(baseBranch: string, cwd: string): void;
export interface CommitAndPushResult {
    committed: boolean;
    branch: string;
}
/**
 * Stages, commits, and pushes changes. Returns whether a commit was made.
 * Skips if there are no staged changes after git add.
 */
export declare function commitAndPush(opts: {
    message: string;
    branch: string;
    token: string;
    repo: string;
    cwd: string;
    setUpstream?: boolean;
    pushRef?: string;
    pushLeaseOid?: string;
}): CommitAndPushResult;
export declare function pushHeadUpdate(opts: {
    branch: string;
    token: string;
    repo: string;
    cwd: string;
    expectedHead: string;
}): void;
//# sourceMappingURL=git.d.ts.map