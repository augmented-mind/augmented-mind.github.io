"use strict";
// CLI: push the current HEAD back to a same-repository PR branch.
// Usage: node .agent/dist/cli/push-pr-head.js
// Env: BRANCH, GH_TOKEN, GITHUB_REPOSITORY, EXPECTED_HEAD_SHA, GITHUB_WORKSPACE
// Outputs: pushed, branch
Object.defineProperty(exports, "__esModule", { value: true });
const git_js_1 = require("../git.js");
const output_js_1 = require("../output.js");
const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
const branch = process.env.BRANCH || "";
const token = process.env.GH_TOKEN || "";
const repo = process.env.GITHUB_REPOSITORY || "";
const expectedHead = process.env.EXPECTED_HEAD_SHA || "";
if (!branch || !token || !repo || !expectedHead) {
    console.error("Missing BRANCH, GH_TOKEN, GITHUB_REPOSITORY, or EXPECTED_HEAD_SHA");
    process.exitCode = 2;
}
else {
    (0, git_js_1.pushHeadUpdate)({ branch, token, repo, cwd, expectedHead });
    (0, output_js_1.setOutput)("pushed", "true");
    (0, output_js_1.setOutput)("branch", branch);
}
//# sourceMappingURL=push-pr-head.js.map