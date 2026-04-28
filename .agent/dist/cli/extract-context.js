"use strict";
// CLI: extract portal event context from GitHub webhook payload.
// Usage: node .agent/dist/cli/extract-context.js
// Env: GITHUB_EVENT_PATH, GITHUB_EVENT_NAME, GITHUB_REPOSITORY, INPUT_MENTION,
//      INPUT_TRIGGER_KIND, INPUT_LABEL_NAME, INPUT_AUTHOR_ASSOCIATION
// Outputs: should_respond, association, body, source_kind, target_kind,
//          target_number, target_url, reaction_subject_id, response_kind,
//          source_comment_id, source_comment_url, review_comment_id,
//          discussion_node_id, reply_to_id, requested_by, requested_route, requested_skill
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const access_policy_js_1 = require("../access-policy.js");
const github_js_1 = require("../github.js");
const output_js_1 = require("../output.js");
const context_js_1 = require("../context.js");
const approval_js_1 = require("../approval.js");
const discussion_js_1 = require("../discussion.js");
const triage_js_1 = require("../triage.js");
const eventPath = process.env.GITHUB_EVENT_PATH;
const eventName = process.env.GITHUB_EVENT_NAME || "";
const mention = process.env.INPUT_MENTION || context_js_1.DEFAULT_MENTION;
const triggerKind = String(process.env.INPUT_TRIGGER_KIND || "mention").trim().toLowerCase();
const labelName = process.env.INPUT_LABEL_NAME || "";
const authorAssociationOverride = process.env.INPUT_AUTHOR_ASSOCIATION || "";
const repository = process.env.GITHUB_REPOSITORY || "";
const ISSUE_ASSOCIATIONS_TRUSTED_WITHOUT_REFRESH = new Set([
    "OWNER",
    "MEMBER",
    "COLLABORATOR",
]);
function hasOrgMembership(orgLogin, userLogin) {
    const membershipState = (0, github_js_1.ghApi)([
        `orgs/${orgLogin}/memberships/${userLogin}`,
        "--jq",
        ".state // empty",
    ]).toLowerCase();
    if (membershipState === "active") {
        return true;
    }
    // Public membership endpoint returns 204 (empty body) on success, so use
    // ghApiOk rather than checking the body.
    return (0, github_js_1.ghApiOk)([`orgs/${orgLogin}/members/${userLogin}`]);
}
function hasRepositoryPermission(userLogin) {
    if (!repository || !userLogin) {
        return false;
    }
    const permission = (0, github_js_1.ghApi)([
        `repos/${repository}/collaborators/${userLogin}/permission`,
        "--jq",
        ".permission // .role_name // empty",
    ]).toLowerCase();
    return Boolean(permission) && permission !== "none";
}
function hasRepositoryCollaborator(userLogin) {
    const login = String(userLogin || "").trim();
    if (!repository || !login) {
        return false;
    }
    return (0, github_js_1.ghApiOk)([`repos/${repository}/collaborators/${login}`]);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveLabelActorAssociation(payload) {
    const override = String(authorAssociationOverride || "").trim().toUpperCase();
    if (override) {
        return override;
    }
    const senderLogin = String(payload.sender?.login || "").trim();
    const ownerLogin = String(payload.repository?.owner?.login || repository.split("/")[0] || "").trim();
    const ownerType = String(payload.repository?.owner?.type || "").trim().toLowerCase();
    if (!senderLogin) {
        return "NONE";
    }
    if (ownerType === "user" && senderLogin.toLowerCase() === ownerLogin.toLowerCase()) {
        return "OWNER";
    }
    if (ownerType === "organization" && ownerLogin && hasOrgMembership(ownerLogin, senderLogin)) {
        return "MEMBER";
    }
    if (hasRepositoryPermission(senderLogin)) {
        return "COLLABORATOR";
    }
    return "NONE";
}
function refreshIssueAssociation(association, issueNumber, issueAuthorLogin) {
    const normalized = String(association || "").trim().toUpperCase();
    if (authorAssociationOverride ||
        eventName !== "issues" ||
        ISSUE_ASSOCIATIONS_TRUSTED_WITHOUT_REFRESH.has(normalized) ||
        !repository ||
        !issueNumber) {
        return normalized || association;
    }
    const refreshed = (0, github_js_1.ghApi)([
        `repos/${repository}/issues/${issueNumber}`,
        "--jq",
        ".author_association // empty",
    ]).toUpperCase();
    const resolved = refreshed || normalized || association;
    if (ISSUE_ASSOCIATIONS_TRUSTED_WITHOUT_REFRESH.has(resolved)) {
        return resolved;
    }
    if (hasRepositoryCollaborator(issueAuthorLogin)) {
        return "COLLABORATOR";
    }
    return resolved;
}
if (!eventPath || !eventName) {
    console.error("Missing GITHUB_EVENT_PATH or GITHUB_EVENT_NAME");
    process.exitCode = 2;
}
else {
    const payload = JSON.parse((0, node_fs_1.readFileSync)(eventPath, "utf8"));
    // Gate 1: skip bot-authored events
    if ((0, context_js_1.shouldSkipSender)(payload)) {
        (0, output_js_1.setOutput)("should_respond", "false");
        console.log("Skipping bot-authored event");
    }
    else {
        // Gate 2: check author association
        const association = triggerKind === "label"
            ? resolveLabelActorAssociation(payload)
            : refreshIssueAssociation(authorAssociationOverride || (0, context_js_1.getAuthorAssociation)(eventName, payload), String(payload.issue?.number || ""), String(payload.issue?.user?.login || ""));
        if (!(0, access_policy_js_1.isKnownAuthorAssociation)(association)) {
            (0, output_js_1.setOutput)("should_respond", "false");
            console.log(`Skipping unsupported sender association: ${association}`);
        }
        else {
            const ctx = (0, context_js_1.extractEventContext)(eventName, payload);
            // Gate 3: validate target number
            if (!ctx.targetNumber) {
                (0, output_js_1.setOutput)("should_respond", "false");
                console.log("No target number found");
            }
            // Gate 4: check for live mention when mention-triggered
            else if (triggerKind !== "label" && !(0, context_js_1.shouldRespondToMention)(eventName, payload, mention)) {
                (0, output_js_1.setOutput)("should_respond", "false");
                console.log("No live mention found");
            }
            // Gate 5: skip approval commands on mention triggers
            else if (triggerKind !== "label" && (0, approval_js_1.isApprovalCommand)(ctx.body, mention)) {
                (0, output_js_1.setOutput)("should_respond", "false");
                console.log("Skipping approval command (handled by agent-approve)");
            }
            else {
                // Resolve discussion reply threading if needed
                let replyToId = "";
                if (ctx.discussionCommentNodeId) {
                    try {
                        replyToId = (0, discussion_js_1.resolveDiscussionReplyTo)(ctx.discussionCommentNodeId);
                    }
                    catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        console.warn(`Could not resolve discussion reply-to: ${msg}`);
                    }
                }
                const requestedBy = (triggerKind === "label" ? payload.sender?.login : "") || (0, context_js_1.getRequestedBy)(eventName, payload);
                const requestedLabel = triggerKind === "label" ? (0, triage_js_1.resolveRequestedLabel)(labelName) : null;
                const requestedMention = triggerKind === "label"
                    ? { route: "", skill: "" }
                    : (0, triage_js_1.extractRequestedRouteDecision)(ctx.body, mention);
                const requestedRoute = requestedLabel?.route || requestedMention.route;
                const requestedSkill = requestedLabel?.skill || requestedMention.skill;
                if (triggerKind === "label" && !requestedLabel) {
                    (0, output_js_1.setOutput)("should_respond", "false");
                    console.log(`Ignoring unsupported agent label: ${labelName || "missing"}`);
                }
                else {
                    (0, output_js_1.setOutput)("should_respond", "true");
                    (0, output_js_1.setOutput)("association", association);
                    (0, output_js_1.setOutput)("body", ctx.body);
                    (0, output_js_1.setOutput)("source_kind", ctx.sourceKind);
                    (0, output_js_1.setOutput)("target_kind", ctx.targetKind);
                    (0, output_js_1.setOutput)("target_number", ctx.targetNumber);
                    (0, output_js_1.setOutput)("target_url", ctx.targetUrl);
                    (0, output_js_1.setOutput)("reaction_subject_id", ctx.reactionSubjectId);
                    (0, output_js_1.setOutput)("response_kind", ctx.responseKind);
                    (0, output_js_1.setOutput)("source_comment_id", ctx.sourceCommentId || "");
                    (0, output_js_1.setOutput)("source_comment_url", ctx.sourceCommentUrl || "");
                    (0, output_js_1.setOutput)("review_comment_id", ctx.reviewCommentId || "");
                    (0, output_js_1.setOutput)("discussion_node_id", ctx.discussionNodeId || "");
                    (0, output_js_1.setOutput)("reply_to_id", replyToId);
                    (0, output_js_1.setOutput)("requested_by", requestedBy);
                    (0, output_js_1.setOutput)("requested_route", requestedRoute);
                    (0, output_js_1.setOutput)("requested_skill", requestedSkill);
                }
            }
        }
    }
}
//# sourceMappingURL=extract-context.js.map