"use strict";
// Response posting to GitHub surfaces (issues, PRs, discussions).
//
// Uses gh CLI for all API calls, consistent with the local runtime's GitHub helpers.
// Replaces the Octokit-based respond.cjs + post.cjs files.
Object.defineProperty(exports, "__esModule", { value: true });
exports.postResponse = postResponse;
const node_child_process_1 = require("node:child_process");
const github_js_1 = require("./github.js");
const MAX_BUFFER = 10 * 1024 * 1024;
/**
 * Posts a response to the correct GitHub surface based on responseKind.
 */
function postResponse(target, body) {
    if (!body.trim()) {
        throw new Error("Response body is empty");
    }
    switch (target.responseKind) {
        case "issue_comment":
            (0, github_js_1.postIssueComment)(target.targetNumber, body, target.repo);
            break;
        case "pr_comment":
            (0, github_js_1.postPrComment)(target.targetNumber, body, target.repo);
            break;
        case "review_comment_reply":
            if (!target.reviewCommentId || !target.repo) {
                throw new Error("review_comment_reply requires reviewCommentId and repo");
            }
            replyToReviewComment(target.repo, target.targetNumber, target.reviewCommentId, body);
            break;
        case "discussion_comment":
            if (!target.discussionNodeId) {
                throw new Error("discussion_comment requires discussionNodeId");
            }
            postDiscussionComment(target.discussionNodeId, body, target.replyToId);
            break;
        default:
            throw new Error(`Unsupported response kind: ${target.responseKind}`);
    }
}
/**
 * Replies to a PR review comment via REST API.
 */
function replyToReviewComment(repo, pullNumber, commentId, body) {
    (0, node_child_process_1.execFileSync)("gh", [
        "api",
        "--method", "POST",
        `repos/${repo}/pulls/${pullNumber}/comments/${commentId}/replies`,
        "-f", `body=${body}`,
    ], { stdio: "pipe", maxBuffer: MAX_BUFFER });
}
/**
 * Posts a comment to a GitHub discussion via GraphQL.
 */
function postDiscussionComment(discussionId, body, replyToId) {
    let query;
    let args;
    if (replyToId) {
        query = `
      mutation($discussionId: ID!, $body: String!, $replyToId: ID!) {
        addDiscussionComment(input: {
          discussionId: $discussionId,
          body: $body,
          replyToId: $replyToId
        }) {
          comment { url }
        }
      }
    `;
        args = [
            "api", "graphql",
            "-f", `query=${query}`,
            "-f", `discussionId=${discussionId}`,
            "-f", `body=${body}`,
            "-f", `replyToId=${replyToId}`,
        ];
    }
    else {
        query = `
      mutation($discussionId: ID!, $body: String!) {
        addDiscussionComment(input: {
          discussionId: $discussionId,
          body: $body
        }) {
          comment { url }
        }
      }
    `;
        args = [
            "api", "graphql",
            "-f", `query=${query}`,
            "-f", `discussionId=${discussionId}`,
            "-f", `body=${body}`,
        ];
    }
    (0, node_child_process_1.execFileSync)("gh", args, { stdio: "pipe", maxBuffer: MAX_BUFFER });
}
//# sourceMappingURL=respond.js.map