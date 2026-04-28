#!/usr/bin/env node
interface WritableLike {
    write(chunk: string): void;
}
export interface ParsedMemorySearchArgs {
    query: string;
    dir: string;
    limit: number;
    snippets: number;
    json: boolean;
    help: boolean;
}
export declare function parseMemorySearchArgs(argv: string[], env?: NodeJS.ProcessEnv): ParsedMemorySearchArgs;
export declare function runMemorySearchCli(argv: string[], options?: {
    env?: NodeJS.ProcessEnv;
    stdout?: WritableLike;
    stderr?: WritableLike;
}): number;
export {};
//# sourceMappingURL=search.d.ts.map