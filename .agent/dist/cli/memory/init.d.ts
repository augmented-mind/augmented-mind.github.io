#!/usr/bin/env node
interface WritableLike {
    write(chunk: string): void;
}
export interface ParsedMemoryInitArgs {
    dir: string;
    repo: string;
    help: boolean;
}
export declare function parseMemoryInitArgs(argv: string[], env?: NodeJS.ProcessEnv): ParsedMemoryInitArgs;
export declare function runMemoryInitCli(argv: string[], options?: {
    env?: NodeJS.ProcessEnv;
    stdout?: WritableLike;
    stderr?: WritableLike;
}): number;
export {};
//# sourceMappingURL=init.d.ts.map