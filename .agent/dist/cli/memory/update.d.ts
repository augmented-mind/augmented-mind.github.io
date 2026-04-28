#!/usr/bin/env node
import { type EditableFile } from "../../memory-update.js";
interface WritableLike {
    write(chunk: string): void;
}
declare const SUBCOMMANDS: readonly ["add", "replace", "remove", "daily-append"];
type Subcommand = typeof SUBCOMMANDS[number];
interface ParsedArgs {
    subcommand: Subcommand | "";
    dir: string;
    file: EditableFile | "";
    section: string;
    match: string;
    withText: string;
    positional: string;
    help: boolean;
}
export declare function parseUpdateArgs(argv: string[], env?: NodeJS.ProcessEnv): ParsedArgs;
export declare function runMemoryUpdateCli(argv: string[], options?: {
    env?: NodeJS.ProcessEnv;
    stdout?: WritableLike;
    stderr?: WritableLike;
}): number;
export {};
//# sourceMappingURL=update.d.ts.map