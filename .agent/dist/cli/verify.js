"use strict";
// CLI: run post-agent verification.
// Usage: node .agent/dist/cli/verify.js
// Env: GITHUB_WORKSPACE, HEAD_CHANGED, VERIFY_BASE_SHA
// Outputs: verify_exit_code, has_changes
Object.defineProperty(exports, "__esModule", { value: true });
const git_js_1 = require("../git.js");
const verify_js_1 = require("../verify.js");
const output_js_1 = require("../output.js");
const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
const headChanged = process.env.HEAD_CHANGED === "true";
const verifyBaseSha = process.env.VERIFY_BASE_SHA || "";
const worktreeChanged = (0, git_js_1.hasChanges)(cwd);
if (!(0, verify_js_1.shouldRunVerification)(worktreeChanged, headChanged)) {
    (0, output_js_1.setOutput)("verify_exit_code", "0");
    (0, output_js_1.setOutput)("has_changes", "false");
    process.exit(0);
}
if (headChanged && !verifyBaseSha) {
    console.error("HEAD_CHANGED=true requires VERIFY_BASE_SHA for history-aware verification.");
    (0, output_js_1.setOutput)("verify_exit_code", "1");
    (0, output_js_1.setOutput)("has_changes", String(worktreeChanged));
    process.exit(1);
}
const result = (0, verify_js_1.runVerification)(cwd, { baseSha: verifyBaseSha });
(0, output_js_1.setOutput)("verify_exit_code", String(result.exitCode));
(0, output_js_1.setOutput)("has_changes", String(worktreeChanged));
process.exitCode = result.exitCode;
//# sourceMappingURL=verify.js.map