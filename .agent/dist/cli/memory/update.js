#!/usr/bin/env node
"use strict";
// CLI: update agent memory files with validated bullet-level edits.
//
// Usage:
//   node .agent/dist/cli/memory/update.js add --file MEMORY.md --section Durable "<bullet>"
//   node .agent/dist/cli/memory/update.js replace --file MEMORY.md --section Durable --match "<text>" --with "<new bullet>"
//   node .agent/dist/cli/memory/update.js remove --file MEMORY.md --section Durable --match "<text>"
//   node .agent/dist/cli/memory/update.js daily-append "<bullet>"
//
// Env:
//   MEMORY_DIR  fallback for --dir when not passed explicitly
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUpdateArgs = parseUpdateArgs;
exports.runMemoryUpdateCli = runMemoryUpdateCli;
const node_util_1 = require("node:util");
const memory_update_js_1 = require("../../memory-update.js");
const USAGE = [
    "Usage: memory/update.js <subcommand> [options] [text]",
    "",
    "Subcommands:",
    "  add --file <MEMORY.md|PROJECT.md> --section <name> <bullet>",
    "  replace --file <MEMORY.md|PROJECT.md> --section <name> --match <text> --with <new bullet>",
    "  remove --file <MEMORY.md|PROJECT.md> --section <name> --match <text>",
    "  daily-append <bullet>",
    "",
    "Global options:",
    "  --dir <path>   Memory directory (defaults to MEMORY_DIR or cwd)",
    "  -h, --help     Show this message",
].join("\n");
const SUBCOMMANDS = ["add", "replace", "remove", "daily-append"];
const ARG_CONFIG = {
    options: {
        dir: { type: "string" },
        file: { type: "string" },
        section: { type: "string" },
        match: { type: "string" },
        with: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
    strict: true,
};
function isSubcommand(value) {
    return SUBCOMMANDS.includes(value);
}
function parseUpdateArgs(argv, env = process.env) {
    const { values, positionals } = (0, node_util_1.parseArgs)({ ...ARG_CONFIG, args: argv });
    const file = values.file;
    if (file !== undefined && !(0, memory_update_js_1.isEditableFile)(file)) {
        throw new Error(`--file must be MEMORY.md or PROJECT.md (got ${file})`);
    }
    let subcommand = "";
    const rest = [...positionals];
    const first = rest.shift();
    if (first) {
        if (!isSubcommand(first)) {
            throw new Error(`Unknown subcommand: ${first}`);
        }
        subcommand = first;
    }
    return {
        subcommand,
        dir: values.dir || env.MEMORY_DIR || process.cwd(),
        file: file || "",
        section: values.section || "",
        match: values.match || "",
        withText: values.with || "",
        positional: rest.join(" ").trim(),
        help: Boolean(values.help),
    };
}
function describe(result) {
    switch (result.action.kind) {
        case "added":
            return { code: 0, line: `added bullet to ${result.file}` };
        case "deduped":
            return { code: 0, line: `collapsed duplicate bullet in ${result.file}` };
        case "replaced":
            return { code: 0, line: `replaced bullet in ${result.file}` };
        case "removed":
            return { code: 0, line: `removed bullet from ${result.file}` };
        case "noop":
            return { code: 0, line: `no change (duplicate): ${result.file}` };
        case "missing_section":
            return { code: 2, line: `section not found: ${result.action.section} in ${result.file}` };
        case "missing_match":
            return { code: 2, line: `no bullet matched: ${result.action.match} in ${result.file}` };
        case "ambiguous_match":
            return {
                code: 2,
                line: `multiple bullets matched: ${result.action.match} in ${result.file}\n${result.action.candidates.join("\n")}`,
            };
    }
}
function runMemoryUpdateCli(argv, options = {}) {
    const env = options.env || process.env;
    const stdout = options.stdout || process.stdout;
    const stderr = options.stderr || process.stderr;
    let parsed;
    try {
        parsed = parseUpdateArgs(argv, env);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stderr.write(`${message}\n\n${USAGE}\n`);
        return 1;
    }
    if (parsed.help || !parsed.subcommand) {
        stdout.write(`${USAGE}\n`);
        return parsed.help ? 0 : 1;
    }
    try {
        let result;
        switch (parsed.subcommand) {
            case "add": {
                if (!parsed.file)
                    throw new Error("--file is required for add");
                if (!parsed.section)
                    throw new Error("--section is required for add");
                if (!parsed.positional)
                    throw new Error("bullet text is required for add");
                result = (0, memory_update_js_1.addBullet)({ root: parsed.dir, file: parsed.file, section: parsed.section }, parsed.positional);
                break;
            }
            case "replace": {
                if (!parsed.file)
                    throw new Error("--file is required for replace");
                if (!parsed.section)
                    throw new Error("--section is required for replace");
                if (!parsed.match)
                    throw new Error("--match is required for replace");
                if (!parsed.withText)
                    throw new Error("--with is required for replace");
                result = (0, memory_update_js_1.replaceBullet)({ root: parsed.dir, file: parsed.file, section: parsed.section }, parsed.match, parsed.withText);
                break;
            }
            case "remove": {
                if (!parsed.file)
                    throw new Error("--file is required for remove");
                if (!parsed.section)
                    throw new Error("--section is required for remove");
                if (!parsed.match)
                    throw new Error("--match is required for remove");
                result = (0, memory_update_js_1.removeBullet)({ root: parsed.dir, file: parsed.file, section: parsed.section }, parsed.match);
                break;
            }
            case "daily-append": {
                if (!parsed.positional)
                    throw new Error("bullet text is required for daily-append");
                result = (0, memory_update_js_1.appendDailyBullet)(parsed.dir, parsed.positional);
                break;
            }
        }
        const { code, line } = describe(result);
        (code === 0 ? stdout : stderr).write(`${line}\n`);
        return code;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stderr.write(`${message}\n`);
        return 1;
    }
}
if (require.main === module) {
    process.exitCode = runMemoryUpdateCli(process.argv.slice(2));
}
//# sourceMappingURL=update.js.map