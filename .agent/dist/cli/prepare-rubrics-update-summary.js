"use strict";
// CLI: build the rubrics-update summary comment body.
// Usage: node .agent/dist/cli/prepare-rubrics-update-summary.js
// Env: RESPONSE_FILE, RUBRICS_COMMITTED, RUBRICS_STEP_OUTCOME, RUBRICS_REF,
//      PR_NUMBER, RUNNER_TEMP
// Outputs: body_file
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
const node_path_1 = require("node:path");
const response_js_1 = require("../response.js");
const output_js_1 = require("../output.js");
const responseFile = process.env.RESPONSE_FILE || "";
const rubricsCommitted = process.env.RUBRICS_COMMITTED === "true";
const runSucceeded = process.env.RUBRICS_STEP_OUTCOME === "success";
const rubricsRef = process.env.RUBRICS_REF || "agent/rubrics";
const prNumber = process.env.PR_NUMBER || "";
let summary = "";
if (responseFile) {
    try {
        summary = (0, node_fs_1.readFileSync)(responseFile, "utf8");
    }
    catch {
        console.error(`Could not read response file: ${responseFile}`);
    }
}
const body = (0, response_js_1.formatRubricsUpdateComment)({
    prNumber,
    rubricsRef,
    rubricsCommitted,
    runSucceeded,
    summary,
});
const runnerTemp = process.env.RUNNER_TEMP || "/tmp";
const bodyFile = (0, node_path_1.join)(runnerTemp, `rubrics-update-summary-${(0, node_crypto_1.randomBytes)(8).toString("hex")}.md`);
(0, node_fs_1.writeFileSync)(bodyFile, body + "\n", "utf8");
(0, output_js_1.setOutput)("body_file", bodyFile);
//# sourceMappingURL=prepare-rubrics-update-summary.js.map