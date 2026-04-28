"use strict";
// CLI: stage, commit, and push changes.
// Usage: node .agent/dist/cli/commit.js
// Env: COMMIT_CWD or GITHUB_WORKSPACE, COMMIT_MESSAGE, BRANCH, GH_TOKEN, GITHUB_REPOSITORY
//      PUSH_REF (optional — push to HEAD:<ref> instead of branch)
//      PUSH_LEASE_OID (optional — use --force-with-lease=<ref>:<oid>)
//      SET_UPSTREAM (optional — set upstream tracking)
// Outputs: committed (true/false), branch
Object.defineProperty(exports, "__esModule", { value: true });
const git_js_1 = require("../git.js");
const output_js_1 = require("../output.js");
const cwd = process.env.COMMIT_CWD || process.env.GITHUB_WORKSPACE || process.cwd();
const message = process.env.COMMIT_MESSAGE || "chore: agent changes";
const branch = process.env.BRANCH || "";
const token = process.env.GH_TOKEN || "";
const repo = process.env.GITHUB_REPOSITORY || "";
const pushRef = process.env.PUSH_REF || undefined;
const pushLeaseOid = process.env.PUSH_LEASE_OID || undefined;
const setUpstream = process.env.SET_UPSTREAM === "true";
(0, git_js_1.configureBotIdentity)(cwd);
const result = (0, git_js_1.commitAndPush)({
    message,
    branch,
    token,
    repo,
    cwd,
    pushRef,
    pushLeaseOid,
    setUpstream,
});
(0, output_js_1.setOutput)("committed", String(result.committed));
(0, output_js_1.setOutput)("branch", result.branch);
if (!result.committed) {
    console.log("No changes to commit.");
}
//# sourceMappingURL=commit.js.map