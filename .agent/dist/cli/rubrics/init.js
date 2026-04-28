#!/usr/bin/env node
"use strict";
// CLI: seed the default rubric branch layout.
// Usage: node .agent/dist/cli/rubrics/init.js --dir <dir> --repo <owner/repo>
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRubricsInitCli = runRubricsInitCli;
const node_util_1 = require("node:util");
const node_path_1 = require("node:path");
const rubrics_js_1 = require("../../rubrics.js");
const ARG_CONFIG = {
    options: {
        dir: { type: "string" },
        repo: { type: "string" },
    },
    allowPositionals: false,
    strict: true,
};
function runRubricsInitCli(argv, env = process.env) {
    let values;
    try {
        values = (0, node_util_1.parseArgs)({ ...ARG_CONFIG, args: argv }).values;
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 1;
    }
    const dir = (0, node_path_1.resolve)(values.dir || env.RUBRICS_DIR || process.cwd());
    const repo = values.repo || env.REPO_SLUG || env.GITHUB_REPOSITORY || "";
    if (!repo) {
        console.error("Missing repository slug. Pass --repo or set REPO_SLUG/GITHUB_REPOSITORY.");
        return 1;
    }
    const result = (0, rubrics_js_1.ensureRubricsStructure)(dir, repo);
    console.log(JSON.stringify({ dir, repo, createdFiles: result.createdFiles }, null, 2));
    return 0;
}
if (require.main === module) {
    process.exitCode = runRubricsInitCli(process.argv.slice(2));
}
//# sourceMappingURL=init.js.map