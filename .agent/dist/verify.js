"use strict";
// Post-agent verification helper.
//
// Runs lightweight checks on agent-generated changes. Delegates to the
// shared post-agent verification script while providing a typed interface
// for workflow use.
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRunVerification = shouldRunVerification;
exports.runVerification = runVerification;
const node_child_process_1 = require("node:child_process");
const VERIFY_SCRIPT = ".agent/scripts/post-agent-verify.sh";
function shouldRunVerification(hasWorktreeChanges, hasBranchUpdate) {
    return hasWorktreeChanges || hasBranchUpdate;
}
/**
 * Runs the verification script. Returns exit code 0 if verification passed.
 */
function runVerification(cwd, options = {}) {
    try {
        const env = { ...process.env };
        if (options.baseSha) {
            env.VERIFY_BASE_SHA = options.baseSha;
        }
        const output = (0, node_child_process_1.execFileSync)("bash", [VERIFY_SCRIPT], {
            cwd,
            env,
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 120_000,
        }).toString("utf8");
        return { exitCode: 0, output };
    }
    catch (err) {
        const error = err;
        const stdout = error.stdout?.toString("utf8") ?? "";
        const stderr = error.stderr?.toString("utf8") ?? "";
        return {
            exitCode: error.status ?? 1,
            output: stdout + stderr,
        };
    }
}
//# sourceMappingURL=verify.js.map