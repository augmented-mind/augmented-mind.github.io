#!/usr/bin/env node
"use strict";
// CLI: initialize the agent memory tree in a local directory.
// Usage: node .agent/dist/cli/memory/init.js [--dir <path>] [--repo <slug>]
// Env: MEMORY_DIR, REPO_SLUG, GITHUB_REPOSITORY
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMemoryInitArgs = parseMemoryInitArgs;
exports.runMemoryInitCli = runMemoryInitCli;
const node_util_1 = require("node:util");
const node_path_1 = require("node:path");
const memory_artifacts_js_1 = require("../../memory-artifacts.js");
const USAGE = [
    "Usage: memory/init.js [--dir <path>] [--repo <slug>]",
    "",
    "Options:",
    "  --dir <path>       Memory directory to initialize (defaults to MEMORY_DIR or cwd)",
    "  --repo <slug>      Repository slug used in seeded stubs (defaults to REPO_SLUG or GITHUB_REPOSITORY)",
    "  -h, --help         Show this message",
    "",
].join("\n");
const ARG_CONFIG = {
    options: {
        dir: { type: "string" },
        repo: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
    strict: true,
};
function parseMemoryInitArgs(argv, env = process.env) {
    const { values } = (0, node_util_1.parseArgs)({ ...ARG_CONFIG, args: argv });
    return {
        dir: values.dir || env.MEMORY_DIR || process.cwd(),
        repo: values.repo || env.REPO_SLUG || env.GITHUB_REPOSITORY || "",
        help: Boolean(values.help),
    };
}
function runMemoryInitCli(argv, options = {}) {
    const env = options.env || process.env;
    const stdout = options.stdout || process.stdout;
    const stderr = options.stderr || process.stderr;
    let args;
    try {
        args = parseMemoryInitArgs(argv, env);
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
    if (!args.repo || !args.repo.includes("/")) {
        stderr.write(`Missing or invalid repository slug (got: ${args.repo || "empty"}).\n\n${USAGE}`);
        return 1;
    }
    const rootDir = (0, node_path_1.resolve)(args.dir);
    const result = (0, memory_artifacts_js_1.ensureMemoryStructure)(rootDir, args.repo);
    stdout.write(`${JSON.stringify({
        repo: args.repo,
        memoryDir: rootDir,
        createdFiles: result.createdFiles,
    }, null, 2)}\n`);
    return 0;
}
if (require.main === module) {
    process.exitCode = runMemoryInitCli(process.argv.slice(2));
}
//# sourceMappingURL=init.js.map