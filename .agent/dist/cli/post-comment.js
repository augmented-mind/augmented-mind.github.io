"use strict";
// CLI: post a status comment to an issue or PR.
// Usage: node .agent/dist/cli/post-comment.js
// Env: COMMENT_TARGET (issue or pr), TARGET_NUMBER, ROUTE, STATUS,
//      RESPONSE_FILE (optional), BRANCH, PR_URL, REQUESTED_BY,
//      APPROVAL_COMMENT_URL, AGENT_COLLAPSE_OLD_REVIEWS
// Outputs: status
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const github_js_1 = require("../github.js");
const review_summary_minimize_js_1 = require("../review-summary-minimize.js");
const response_js_1 = require("../response.js");
const output_js_1 = require("../output.js");
const session_bundle_js_1 = require("../session-bundle.js");
const target = process.env.COMMENT_TARGET || "issue"; // "issue" or "pr"
const targetNumber = Number(process.env.TARGET_NUMBER || process.env.ISSUE_NUMBER || process.env.PR_NUMBER);
const route = process.env.ROUTE || "implement";
const status = (process.env.STATUS || "failed");
const responseFile = process.env.RESPONSE_FILE || "";
const branch = process.env.BRANCH || "";
const prUrl = process.env.PR_URL || "";
const requestedBy = process.env.REQUESTED_BY || "";
const approvalCommentUrl = process.env.APPROVAL_COMMENT_URL || "";
const resumeStatus = process.env.RESUME_STATUS || "";
const repo = process.env.GITHUB_REPOSITORY || "";
const collapseOldReviews = !["false", "0", "no", "off"].includes((process.env.AGENT_COLLAPSE_OLD_REVIEWS || "").trim().toLowerCase());
let rawResponse = "";
if (responseFile) {
    try {
        rawResponse = (0, node_fs_1.readFileSync)(responseFile, "utf8");
    }
    catch { /* ok */ }
}
const summary = (0, response_js_1.summaryFromAgentResponse)(route, rawResponse);
let body;
if (route === "review") {
    body = (0, response_js_1.formatReviewComment)({
        synthesisBody: summary,
        requestedBy: requestedBy || undefined,
        approvalCommentUrl: approvalCommentUrl || undefined,
    });
}
else if (route === "fix-pr") {
    body = (0, response_js_1.formatFixPrComment)({
        status,
        summary,
        branch,
        requestedBy: requestedBy || undefined,
        approvalCommentUrl: approvalCommentUrl || undefined,
    });
}
else {
    // implement or other
    const parsed = route === "implement"
        ? (0, response_js_1.normalizeImplementationResponse)(rawResponse)
        : { summary, prTitle: "", prBody: "" };
    body = (0, response_js_1.formatImplementComment)({
        status,
        summary: parsed.summary,
        branch: branch || undefined,
        prUrl: prUrl || undefined,
        approvalCommentUrl: approvalCommentUrl || undefined,
    });
}
const continuityNote = (0, session_bundle_js_1.formatSessionRestoreNotice)({ resumeStatus, runStatus: status });
if (continuityNote) {
    body = `> ${continuityNote}\n\n${body}`;
}
if (target === "pr") {
    if (route === "review" && collapseOldReviews) {
        try {
            const collapsed = (0, review_summary_minimize_js_1.collapsePreviousReviewSummaries)({ repo, prNumber: targetNumber });
            if (collapsed > 0) {
                console.log(`Collapsed ${collapsed} previous AI review synthesis comment(s).`);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`Failed to collapse previous AI review synthesis comments for ${repo}#${targetNumber}: ${message}`);
        }
    }
    (0, github_js_1.postPrComment)(targetNumber, body);
}
else {
    (0, github_js_1.postIssueComment)(targetNumber, body);
}
(0, output_js_1.setOutput)("comment_posted", "true");
//# sourceMappingURL=post-comment.js.map