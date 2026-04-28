"use strict";
// CLI: build and write the approval request comment body.
// Usage: node .agent/dist/cli/prepare-approval.js
// Env: ROUTE, SOURCE_KIND, TARGET_KIND, TARGET_NUMBER, TARGET_URL,
//      SUMMARY, ISSUE_TITLE, ISSUE_BODY, REQUEST_TEXT, WORKFLOW_FILE
// Outputs: body_file
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const output_js_1 = require("../output.js");
const approval_js_1 = require("../approval.js");
const context_js_1 = require("../context.js");
const route = process.env.ROUTE || "implement";
const sourceKind = process.env.SOURCE_KIND || "";
const targetKind = process.env.TARGET_KIND || "";
const targetNumber = Number(process.env.TARGET_NUMBER || "0");
const targetUrl = process.env.TARGET_URL || "";
const summary = process.env.SUMMARY || "";
const issueTitle = process.env.ISSUE_TITLE || "";
const issueBody = process.env.ISSUE_BODY || "";
const requestText = process.env.REQUEST_TEXT || "";
const workflowFile = process.env.WORKFLOW_FILE || "agent-implement.yml";
const mention = process.env.INPUT_MENTION || context_js_1.DEFAULT_MENTION;
const requestId = `req-${(0, node_crypto_1.randomBytes)(3).toString("hex")}`;
const routeLabel = route === "create-action" ? "action creation" : "implementation";
// Build the hidden marker with dispatch metadata
const markerData = {
    route,
    source_kind: sourceKind,
    target_kind: targetKind,
    target_number: targetNumber,
    target_url: targetUrl,
    workflow: workflowFile,
    request_id: requestId,
    request_text: requestText,
};
if (issueTitle) {
    markerData.issue_title = issueTitle;
    markerData.issue_body = issueBody;
}
const marker = (0, approval_js_1.buildApprovalRequestMarker)(markerData);
// Build the comment body
const lines = [];
lines.push(`I triaged this as a \`${route}\` request.`);
lines.push("");
lines.push(summary);
lines.push("");
if ((route === "implement" || route === "create-action") && issueTitle && targetKind !== "issue") {
    lines.push("### Proposed issue");
    lines.push("");
    lines.push(`> **${issueTitle}**`);
    lines.push(">");
    for (const line of issueBody.split("\n")) {
        lines.push(`> ${line}`);
    }
    lines.push("");
    lines.push("Reply with:");
    lines.push("");
    lines.push("```text");
    lines.push(`${mention} /approve ${requestId}`);
    lines.push("```");
    lines.push("");
    lines.push(`to create the issue and start the ${routeLabel} workflow.`);
}
else {
    lines.push("Reply with:");
    lines.push("");
    lines.push("```text");
    lines.push(`${mention} /approve ${requestId}`);
    lines.push("```");
    lines.push("");
    lines.push(`to start the ${routeLabel} workflow.`);
}
lines.push("");
lines.push(marker);
const runnerTemp = process.env.RUNNER_TEMP || "/tmp";
const bodyFile = (0, node_path_1.join)(runnerTemp, `agent-approval-request-${(0, node_crypto_1.randomBytes)(8).toString("hex")}.md`);
(0, node_fs_1.writeFileSync)(bodyFile, lines.join("\n") + "\n", "utf8");
(0, output_js_1.setOutput)("body_file", bodyFile);
//# sourceMappingURL=prepare-approval.js.map