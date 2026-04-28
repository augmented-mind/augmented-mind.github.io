"use strict";
// CLI: fetch PR metadata and checkout the PR head branch.
// Usage: node .agent/dist/cli/checkout-pr.js
// Env: PR_NUMBER, GH_TOKEN, GITHUB_REPOSITORY
// Outputs: head_ref, head_sha, cross_repo, pr_state
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const output_js_1 = require("../output.js");
const github_js_1 = require("../github.js");
const prNumber = Number(process.env.PR_NUMBER || "0");
const token = process.env.GH_TOKEN || "";
const repo = process.env.GITHUB_REPOSITORY || "";
const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
if (!prNumber) {
    console.error("Missing PR_NUMBER");
    process.exitCode = 2;
}
else {
    const meta = (0, github_js_1.fetchPrMeta)(prNumber);
    let headSha = meta.headOid;
    if (!meta.isCrossRepository && meta.state === "OPEN") {
        const remoteUrl = `https://x-access-token:${token}@github.com/${repo}.git`;
        (0, node_child_process_1.execFileSync)("git", ["fetch", remoteUrl, meta.headRef], { cwd, stdio: "pipe" });
        (0, node_child_process_1.execFileSync)("git", ["checkout", "-B", meta.headRef, "FETCH_HEAD"], { cwd, stdio: "pipe" });
        headSha = (0, node_child_process_1.execFileSync)("git", ["rev-parse", "HEAD"], { cwd, stdio: "pipe" })
            .toString("utf8")
            .trim();
    }
    (0, output_js_1.setOutput)("head_ref", meta.headRef);
    (0, output_js_1.setOutput)("head_sha", headSha);
    (0, output_js_1.setOutput)("cross_repo", String(meta.isCrossRepository));
    (0, output_js_1.setOutput)("pr_state", meta.state);
}
//# sourceMappingURL=checkout-pr.js.map