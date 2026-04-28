#!/usr/bin/env node
interface WritableLike {
    write(chunk: string): void;
}
interface ParsedBootstrapArgs {
    repo: string;
    branch: string;
    remote: string;
    help: boolean;
}
export declare function parseGitHubRepoSlugFromRemoteUrl(url: string): string;
export declare function parseMemoryBootstrapBranchArgs(argv: string[], env?: NodeJS.ProcessEnv, cwd?: string): ParsedBootstrapArgs;
export declare function runMemoryBootstrapBranchCli(argv: string[], options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdout?: WritableLike;
    stderr?: WritableLike;
}): number;
export {};
//# sourceMappingURL=bootstrap-branch.d.ts.map