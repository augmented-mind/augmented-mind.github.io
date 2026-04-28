"use strict";
// CLI: post a response to the correct GitHub surface.
// Usage: node .agent/dist/cli/post-response.js
// Env: BODY_FILE, RESPONSE_KIND, TARGET_NUMBER, REVIEW_COMMENT_ID,
//      DISCUSSION_ID, REPLY_TO_ID, GITHUB_REPOSITORY
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const respond_js_1 = require("../respond.js");
const session_bundle_js_1 = require("../session-bundle.js");
const bodyFile = process.env.BODY_FILE || "";
const responseKind = process.env.RESPONSE_KIND || "issue_comment";
const targetNumber = Number(process.env.TARGET_NUMBER || "0");
const reviewCommentId = Number(process.env.REVIEW_COMMENT_ID || "0") || undefined;
const discussionNodeId = process.env.DISCUSSION_ID || undefined;
const replyToId = process.env.REPLY_TO_ID || undefined;
const repo = process.env.GITHUB_REPOSITORY || undefined;
const resumeStatus = process.env.RESUME_STATUS || "";
const runStatus = process.env.STATUS || "success";
let body = "";
if (bodyFile) {
    try {
        body = (0, node_fs_1.readFileSync)(bodyFile, "utf8");
    }
    catch {
        console.error(`Could not read body file: ${bodyFile}`);
    }
}
if (!body.trim()) {
    body = "I was unable to produce a response. Please check the workflow logs.";
}
const continuityNote = (0, session_bundle_js_1.formatSessionRestoreNotice)({ resumeStatus, runStatus });
if (continuityNote) {
    body = `> ${continuityNote}\n\n${body}`;
}
(0, respond_js_1.postResponse)({ responseKind, targetNumber, reviewCommentId, discussionNodeId, replyToId, repo }, body);
//# sourceMappingURL=post-response.js.map