#!/usr/bin/env node
"use strict";
// CLI: read the ref-backed memory sync state and emit cursors as step outputs.
Object.defineProperty(exports, "__esModule", { value: true });
const memory_sync_state_js_1 = require("../../memory-sync-state.js");
const output_js_1 = require("../../output.js");
function buildOptions() {
    const repo = process.env.GITHUB_REPOSITORY || process.env.REPO_SLUG || "";
    const token = process.env.INPUT_GITHUB_TOKEN || process.env.GH_TOKEN || "";
    return { repo, token: token || undefined };
}
const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
const state = (0, memory_sync_state_js_1.fetchMemorySyncState)(cwd, buildOptions());
(0, output_js_1.setOutput)("found", state ? "true" : "false");
(0, output_js_1.setOutput)("last_sync_at", state?.last_sync_at || "");
(0, output_js_1.setOutput)("issue_cursor", state?.cursors.issues || "");
(0, output_js_1.setOutput)("pull_cursor", state?.cursors.pulls || "");
(0, output_js_1.setOutput)("discussion_cursor", state?.cursors.discussions || "");
(0, output_js_1.setOutput)("commit_cursor", state?.cursors.commits || "");
(0, output_js_1.setOutput)("last_run_url", state?.last_run_url || "");
process.stdout.write(state ? `${JSON.stringify(state, null, 2)}\n` : "{}\n");
//# sourceMappingURL=read-sync-state.js.map