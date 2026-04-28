"use strict";
// CLI: scan comments for pending approval requests.
// Usage: node .agent/dist/cli/resolve-approval.js
// Env: GITHUB_EVENT_PATH, GITHUB_EVENT_NAME, GITHUB_REPOSITORY,
//      INPUT_MENTION, ACCESS_POLICY, REPOSITORY_PRIVATE
// Outputs: should_dispatch, is_discussion, request_comment_id,
//          request_comment_body, route, target_kind, target_number,
//          target_url, workflow, issue_title, issue_body, request_text,
//          should_create_issue
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
const output_js_1 = require("../output.js");
const context_js_1 = require("../context.js");
const access_policy_js_1 = require("../access-policy.js");
const approval_js_1 = require("../approval.js");
const discussion_js_1 = require("../discussion.js");
const GH_API_MAX_BUFFER = 10 * 1024 * 1024;
const eventPath = process.env.GITHUB_EVENT_PATH;
const eventName = process.env.GITHUB_EVENT_NAME || "";
const repo = process.env.GITHUB_REPOSITORY || "";
const mention = process.env.INPUT_MENTION || context_js_1.DEFAULT_MENTION;
const isPublicRepo = String(process.env.REPOSITORY_PRIVATE || "").trim().toLowerCase() === "false";
function loadAccessPolicy() {
    try {
        return (0, access_policy_js_1.parseAccessPolicy)(process.env.ACCESS_POLICY || "");
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Invalid AGENT_ACCESS_POLICY: ${msg}`);
        return null;
    }
}
function fetchIssueComments(issueNumber) {
    const raw = (0, node_child_process_1.execFileSync)("gh", ["api", "--paginate", `repos/${repo}/issues/${issueNumber}/comments`], { stdio: ["pipe", "pipe", "pipe"], maxBuffer: GH_API_MAX_BUFFER }).toString("utf8");
    const comments = [];
    // --paginate concatenates JSON arrays, so parse each array
    for (const chunk of raw.split(/(?<=\])\s*(?=\[)/)) {
        if (!chunk.trim())
            continue;
        try {
            const arr = JSON.parse(chunk);
            for (const c of arr) {
                comments.push({
                    id: String(c.id),
                    body: c.body || "",
                    created_at: c.created_at || "",
                });
            }
        }
        catch {
            /* skip malformed chunks */
        }
    }
    return comments;
}
function main() {
    if (!eventPath || !eventName || !repo) {
        console.error("Missing GITHUB_EVENT_PATH, GITHUB_EVENT_NAME, or GITHUB_REPOSITORY");
        (0, output_js_1.setOutput)("should_dispatch", "false");
        process.exitCode = 2;
        return;
    }
    const accessPolicy = loadAccessPolicy();
    if (!accessPolicy) {
        (0, output_js_1.setOutput)("should_dispatch", "false");
        process.exitCode = 2;
        return;
    }
    const payload = JSON.parse((0, node_fs_1.readFileSync)(eventPath, "utf8"));
    const commentBody = payload.comment?.body || "";
    // Skip agent-managed approval request/status comments before doing any heavier work.
    if ((0, approval_js_1.isAgentApprovalComment)(commentBody)) {
        console.log("Skipping agent-managed approval comment");
        (0, output_js_1.setOutput)("should_dispatch", "false");
        return;
    }
    const association = payload.comment?.author_association || "NONE";
    if (!(0, access_policy_js_1.isKnownAuthorAssociation)(association)) {
        console.log(`Skipping unsupported approval association: ${association}`);
        (0, output_js_1.setOutput)("should_dispatch", "false");
        return;
    }
    if (!(0, approval_js_1.isApprovalCommand)(commentBody, mention)) {
        console.log("No valid approval command found");
        (0, output_js_1.setOutput)("should_dispatch", "false");
        return;
    }
    const approvalCommand = (0, approval_js_1.parseApprovalCommand)(commentBody, mention);
    if (!approvalCommand) {
        console.log("Approval command is missing a request ID");
        (0, output_js_1.setOutput)("should_dispatch", "false");
        return;
    }
    const isDiscussion = eventName === "discussion_comment";
    let comments;
    if (isDiscussion) {
        const [owner, repoName] = repo.split("/");
        comments = (0, discussion_js_1.fetchDiscussionComments)(owner, repoName, payload.discussion?.number);
    }
    else {
        comments = fetchIssueComments(payload.issue?.number);
    }
    const pending = (0, approval_js_1.findPendingRequestById)(comments, approvalCommand.requestId);
    if (!pending) {
        console.log(`No pending agent approval request found for ${approvalCommand.requestId}`);
        (0, output_js_1.setOutput)("should_dispatch", "false");
        return;
    }
    const route = String(pending.request.route || "");
    if (!(0, access_policy_js_1.isAssociationAllowedForRoute)(accessPolicy, route, association, isPublicRepo)) {
        const allowed = (0, access_policy_js_1.getAllowedAssociationsForRoute)(accessPolicy, route, isPublicRepo);
        console.log(`Skipping unauthorized approval for route ${route || "default"} from ${association}; requires ${allowed.join(", ")}`);
        (0, output_js_1.setOutput)("should_dispatch", "false");
        return;
    }
    (0, output_js_1.setOutput)("should_dispatch", "true");
    (0, output_js_1.setOutput)("is_discussion", String(isDiscussion));
    (0, output_js_1.setOutput)("request_comment_id", String(pending.comment.id));
    (0, output_js_1.setOutput)("request_comment_body", pending.comment.body);
    (0, output_js_1.setOutput)("route", route);
    (0, output_js_1.setOutput)("target_kind", String(pending.request.target_kind || ""));
    (0, output_js_1.setOutput)("target_number", String(pending.request.target_number || ""));
    (0, output_js_1.setOutput)("target_url", String(pending.request.target_url || ""));
    (0, output_js_1.setOutput)("workflow", String(pending.request.workflow || ""));
    (0, output_js_1.setOutput)("issue_title", String(pending.request.issue_title || ""));
    (0, output_js_1.setOutput)("issue_body", String(pending.request.issue_body || ""));
    (0, output_js_1.setOutput)("request_text", String(pending.request.request_text || ""));
    (0, output_js_1.setOutput)("should_create_issue", String((0, approval_js_1.shouldCreateIssueFromApprovalRequest)(pending.request)));
}
main();
//# sourceMappingURL=resolve-approval.js.map