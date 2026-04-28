"use strict";
// CLI: create a GitHub issue, optionally with an origin-link footer.
// Usage: node .agent/dist/cli/create-issue.js
// Env: ISSUE_TITLE, ISSUE_BODY, SOURCE_KIND (optional), TARGET_URL (optional)
// Outputs: issue_number, issue_url
//
// When SOURCE_KIND and TARGET_URL are set, appends a footer pointing back
// to the origin (e.g. "Requested via issue_comment at <url>"). Callers
// without an origin can omit those env vars.
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const github_js_1 = require("../github.js");
const output_js_1 = require("../output.js");
const MAX_TITLE_LENGTH = 70;
function normalizeTitle(raw) {
    const collapsed = raw.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
    if (!collapsed) {
        return "Agent-created issue";
    }
    if (collapsed.length > MAX_TITLE_LENGTH) {
        return `${collapsed.slice(0, MAX_TITLE_LENGTH - 3)}...`;
    }
    return collapsed;
}
const title = normalizeTitle(process.env.ISSUE_TITLE || "");
const rawBody = process.env.ISSUE_BODY || "";
const sourceKind = process.env.SOURCE_KIND || "";
const targetUrl = process.env.TARGET_URL || "";
const bodyLines = [rawBody];
if (targetUrl) {
    bodyLines.push("", "---", "", `Requested via ${sourceKind || "mention"} at ${targetUrl}`);
}
const runnerTemp = process.env.RUNNER_TEMP || "/tmp";
const bodyFile = (0, node_path_1.join)(runnerTemp, `agent-issue-body-${(0, node_crypto_1.randomBytes)(8).toString("hex")}.md`);
(0, node_fs_1.writeFileSync)(bodyFile, bodyLines.join("\n") + "\n", "utf8");
const issueUrl = (0, github_js_1.createIssue)({ title, bodyFile });
const numberMatch = issueUrl.match(/(\d+)$/);
const issueNumber = numberMatch ? numberMatch[1] : "";
(0, output_js_1.setOutput)("issue_url", issueUrl);
(0, output_js_1.setOutput)("issue_number", issueNumber);
console.log(`Issue created: ${issueUrl}`);
//# sourceMappingURL=create-issue.js.map