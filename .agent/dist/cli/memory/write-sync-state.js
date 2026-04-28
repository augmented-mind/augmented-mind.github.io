#!/usr/bin/env node
"use strict";
// CLI: update the ref-backed memory sync state with new cursors.
Object.defineProperty(exports, "__esModule", { value: true });
const git_js_1 = require("../../git.js");
const memory_sync_state_js_1 = require("../../memory-sync-state.js");
const output_js_1 = require("../../output.js");
function buildOptions() {
    const repo = process.env.GITHUB_REPOSITORY || process.env.REPO_SLUG || "";
    const token = process.env.INPUT_GITHUB_TOKEN || process.env.GH_TOKEN || "";
    return { repo, token: token || undefined };
}
const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
const repoSlug = process.env.REPO_SLUG || process.env.GITHUB_REPOSITORY || "";
const options = buildOptions();
const lastSyncAt = process.env.SYNC_LAST_SYNC_AT || "";
const lastActivityAt = process.env.SYNC_LAST_ACTIVITY_AT || "";
const lastRunUrl = process.env.SYNC_LAST_RUN_URL || "";
(0, output_js_1.setOutput)("written", "false");
if (!repoSlug) {
    console.error("Missing REPO_SLUG or GITHUB_REPOSITORY");
    process.exitCode = 2;
}
else if (!lastSyncAt) {
    console.error("Missing SYNC_LAST_SYNC_AT");
    process.exitCode = 2;
}
else {
    (0, git_js_1.configureBotIdentity)(cwd);
    const existing = (0, memory_sync_state_js_1.fetchMemorySyncState)(cwd, options) || (0, memory_sync_state_js_1.createMemorySyncState)(repoSlug);
    const next = (0, memory_sync_state_js_1.updateMemorySyncState)(existing, {
        last_sync_at: lastSyncAt,
        last_activity_at: lastActivityAt || existing.last_activity_at || lastSyncAt,
        last_run_url: lastRunUrl,
        cursors: {
            issues: process.env.SYNC_ISSUE_CURSOR || existing.cursors.issues,
            pulls: process.env.SYNC_PULL_CURSOR || existing.cursors.pulls,
            discussions: process.env.SYNC_DISCUSSION_CURSOR || existing.cursors.discussions,
            commits: process.env.SYNC_COMMIT_CURSOR || existing.cursors.commits,
        },
    });
    (0, memory_sync_state_js_1.writeMemorySyncState)(next, cwd, options);
    (0, output_js_1.setOutput)("written", "true");
    process.stdout.write(`${JSON.stringify(next, null, 2)}\n`);
}
//# sourceMappingURL=write-sync-state.js.map