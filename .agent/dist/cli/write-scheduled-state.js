#!/usr/bin/env node
"use strict";
// CLI: write a ref-backed scheduled workflow state record.
Object.defineProperty(exports, "__esModule", { value: true });
const git_js_1 = require("../git.js");
const scheduled_activity_js_1 = require("../scheduled-activity.js");
const output_js_1 = require("../output.js");
function buildOptions() {
    const repo = process.env.GITHUB_REPOSITORY || process.env.REPO_SLUG || "";
    const token = process.env.INPUT_GITHUB_TOKEN || process.env.GH_TOKEN || "";
    return { repo, token: token || undefined };
}
const ref = process.env.SCHEDULE_STATE_REF || "";
const field = process.env.SCHEDULE_STATE_FIELD || "";
const value = process.env.SCHEDULE_STATE_VALUE || new Date().toISOString();
const repoSlug = process.env.REPO_SLUG || process.env.GITHUB_REPOSITORY || "";
const runUrl = process.env.SCHEDULE_LAST_RUN_URL || "";
const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
const options = buildOptions();
(0, output_js_1.setOutput)("written", "false");
if (!ref) {
    console.error("Missing SCHEDULE_STATE_REF");
    process.exitCode = 2;
}
else if (!field) {
    console.error("Missing SCHEDULE_STATE_FIELD");
    process.exitCode = 2;
}
else {
    (0, git_js_1.configureBotIdentity)(cwd);
    const now = new Date().toISOString();
    const existing = (0, scheduled_activity_js_1.fetchJsonState)(ref, cwd, options) || {};
    const next = {
        ...existing,
        schema_version: 1,
        repo_slug: repoSlug || existing.repo_slug || "",
        [field]: value,
        last_run_url: runUrl || existing.last_run_url || "",
        created_at: typeof existing.created_at === "string" ? existing.created_at : now,
        updated_at: now,
    };
    (0, scheduled_activity_js_1.writeJsonState)(ref, next, cwd, options);
    (0, output_js_1.setOutput)("written", "true");
    process.stdout.write(`${JSON.stringify(next, null, 2)}\n`);
}
//# sourceMappingURL=write-scheduled-state.js.map