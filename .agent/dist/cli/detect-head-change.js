"use strict";
// CLI: detect whether the checked-out branch HEAD changed during a run.
// Usage: node .agent/dist/cli/detect-head-change.js
// Env: ORIGINAL_HEAD_SHA, GITHUB_WORKSPACE
// Outputs: head_changed, current_head
Object.defineProperty(exports, "__esModule", { value: true });
const git_js_1 = require("../git.js");
const output_js_1 = require("../output.js");
const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
const originalHead = process.env.ORIGINAL_HEAD_SHA || "";
const current = (0, git_js_1.currentHead)(cwd);
if (!originalHead) {
    console.warn("ORIGINAL_HEAD_SHA was not set; treating branch head as unchanged.");
}
(0, output_js_1.setOutput)("current_head", current);
(0, output_js_1.setOutput)("head_changed", String((0, git_js_1.hasHeadChanged)(originalHead, cwd)));
//# sourceMappingURL=detect-head-change.js.map