#!/usr/bin/env node
"use strict";
// CLI: search agent memory files in a local directory.
// Usage: node .agent/dist/cli/memory/search.js [--dir <path>] [--limit <n>] [--snippets <n>] [--json] <query>
// Env: MEMORY_DIR (optional fallback for --dir)
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMemorySearchArgs = parseMemorySearchArgs;
exports.runMemorySearchCli = runMemorySearchCli;
const node_util_1 = require("node:util");
const node_path_1 = require("node:path");
const memory_search_js_1 = require("../../memory-search.js");
const USAGE = [
    "Usage: memory/search.js [--dir <path>] [--limit <n>] [--snippets <n>] [--json] <query>",
    "",
    "Options:",
    "  --dir <path>       Memory directory to search (defaults to MEMORY_DIR or cwd)",
    "  --limit <n>        Maximum number of files to return (default: 5)",
    "  --snippets <n>     Maximum snippets per file (default: 3)",
    "  --json             Emit machine-readable JSON instead of text",
    "  -h, --help         Show this message",
    "",
].join("\n");
const ARG_CONFIG = {
    options: {
        dir: { type: "string" },
        limit: { type: "string" },
        snippets: { type: "string" },
        json: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
    strict: true,
};
function parsePositiveInteger(value, flagName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${flagName} must be a positive integer`);
    }
    return parsed;
}
function parseMemorySearchArgs(argv, env = process.env) {
    const { values, positionals } = (0, node_util_1.parseArgs)({ ...ARG_CONFIG, args: argv });
    const dir = values.dir || env.MEMORY_DIR || "";
    const limit = values.limit !== undefined
        ? parsePositiveInteger(values.limit, "--limit")
        : 5;
    const snippets = values.snippets !== undefined
        ? parsePositiveInteger(values.snippets, "--snippets")
        : 3;
    return {
        query: positionals.join(" ").trim() || env.MEMORY_QUERY || "",
        dir: dir || process.cwd(),
        limit,
        snippets,
        json: Boolean(values.json),
        help: Boolean(values.help),
    };
}
function serializeJson(query, dir, results) {
    return `${JSON.stringify({
        query,
        memoryDir: (0, node_path_1.resolve)(dir),
        resultCount: results.length,
        results,
    }, null, 2)}\n`;
}
function runMemorySearchCli(argv, options = {}) {
    const env = options.env || process.env;
    const stdout = options.stdout || process.stdout;
    const stderr = options.stderr || process.stderr;
    let args;
    try {
        args = parseMemorySearchArgs(argv, env);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stderr.write(`${message}\n\n${USAGE}`);
        return 1;
    }
    if (args.help) {
        stdout.write(USAGE);
        return 0;
    }
    if (!args.query) {
        stderr.write(`Missing search query.\n\n${USAGE}`);
        return 1;
    }
    try {
        const results = (0, memory_search_js_1.searchMemory)(args.query, {
            rootDir: args.dir,
            limit: args.limit,
            snippetsPerFile: args.snippets,
        });
        if (args.json) {
            stdout.write(serializeJson(args.query, args.dir, results));
        }
        else {
            stdout.write((0, memory_search_js_1.formatMemorySearchResults)(args.query, results, args.dir));
        }
        return 0;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stderr.write(`${message}\n`);
        return 1;
    }
}
if (require.main === module) {
    process.exitCode = runMemorySearchCli(process.argv.slice(2));
}
//# sourceMappingURL=search.js.map