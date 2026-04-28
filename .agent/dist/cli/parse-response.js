"use strict";
// CLI: parse agent response and determine run status.
// Usage: node .agent/dist/cli/parse-response.js
// Env: RESPONSE_FILE, AGENT_EXIT_CODE, HAS_CHANGES, VERIFY_EXIT_CODE, HEAD_CHANGED
// Outputs: status, summary, commit_message, pr_title, pr_body
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const response_js_1 = require("../response.js");
const output_js_1 = require("../output.js");
const agentExit = Number(process.env.AGENT_EXIT_CODE || "0");
const hasChanges = process.env.HAS_CHANGES === "true";
const headChanged = process.env.HEAD_CHANGED === "true";
const verifyExit = Number(process.env.VERIFY_EXIT_CODE || "0");
const responseFile = process.env.RESPONSE_FILE || "";
const status = (0, response_js_1.determineRunStatus)(agentExit, hasChanges, verifyExit, headChanged);
(0, output_js_1.setOutput)("status", status);
let raw = "";
if (responseFile) {
    try {
        raw = (0, node_fs_1.readFileSync)(responseFile, "utf8");
    }
    catch { /* ok */ }
}
const response = (0, response_js_1.normalizeImplementationResponse)(raw);
(0, output_js_1.setOutput)("summary", response.summary);
(0, output_js_1.setOutput)("commit_message", response.commitMessage);
(0, output_js_1.setOutput)("pr_title", response.prTitle);
(0, output_js_1.setOutput)("pr_body", response.prBody);
//# sourceMappingURL=parse-response.js.map