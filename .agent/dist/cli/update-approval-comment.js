"use strict";
// CLI: update an approval request comment to mark it as satisfied.
// Usage: node .agent/dist/cli/update-approval-comment.js
// Env: REQUEST_COMMENT_ID, REQUEST_COMMENT_BODY, IS_DISCUSSION,
//      ROUTE, WORKFLOW, CREATED_ISSUE_URL, RUN_URL, APPROVER,
//      GITHUB_REPOSITORY
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const approval_js_1 = require("../approval.js");
const discussion_js_1 = require("../discussion.js");
const commentId = process.env.REQUEST_COMMENT_ID || "";
const commentBody = process.env.REQUEST_COMMENT_BODY || "";
const isDiscussion = process.env.IS_DISCUSSION === "true";
const route = process.env.ROUTE || "";
const workflow = process.env.WORKFLOW || "";
const createdIssueUrl = process.env.CREATED_ISSUE_URL || "";
const runUrl = process.env.RUN_URL || "";
const approver = process.env.APPROVER || "";
const repo = process.env.GITHUB_REPOSITORY || "";
if (!commentId || !commentBody) {
    console.error("Missing REQUEST_COMMENT_ID or REQUEST_COMMENT_BODY");
    process.exitCode = 1;
}
else {
    const newBody = (0, approval_js_1.markApprovalRequestSatisfied)(commentBody, approver, {
        route: route || undefined,
        workflow: workflow || undefined,
        issueUrl: createdIssueUrl || undefined,
        runUrl: runUrl || undefined,
    });
    if (isDiscussion) {
        (0, discussion_js_1.updateDiscussionComment)(commentId, newBody);
    }
    else {
        (0, node_child_process_1.execFileSync)("gh", [
            "api", "--method", "PATCH",
            `repos/${repo}/issues/comments/${commentId}`,
            "-f", `body=${newBody}`,
        ], { stdio: "pipe", maxBuffer: 10 * 1024 * 1024 });
    }
}
//# sourceMappingURL=update-approval-comment.js.map