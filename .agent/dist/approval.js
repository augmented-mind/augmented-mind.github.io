"use strict";
// Helpers for encoding, finding, and resolving comment-based approval requests
// left by the portal workflow before dispatching heavier follow-up workflows.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApprovalRequestMarker = buildApprovalRequestMarker;
exports.parseApprovalRequestMarker = parseApprovalRequestMarker;
exports.isApprovalRequestAlreadySatisfied = isApprovalRequestAlreadySatisfied;
exports.isAgentApprovalComment = isAgentApprovalComment;
exports.markApprovalRequestSatisfied = markApprovalRequestSatisfied;
exports.isApprovalCommand = isApprovalCommand;
exports.parseApprovalCommand = parseApprovalCommand;
exports.findPendingRequestById = findPendingRequestById;
exports.shouldCreateIssueFromApprovalRequest = shouldCreateIssueFromApprovalRequest;
const context_js_1 = require("./context.js");
const mentions_js_1 = require("./mentions.js");
const APPROVAL_MARKER_RE = /<!--\s*sepo-agent-request\s+base64:([A-Za-z0-9_-]+)\s*-->/i;
const APPROVAL_STATUS_RE = /<!--\s*sepo-agent-approved\s*-->/i;
function buildApprovalCommandRegex(mention) {
    const trimmedMention = String(mention || "").trim();
    if (!trimmedMention) {
        return null;
    }
    return new RegExp(`(?:^|\\s)${(0, mentions_js_1.escapeRegex)(trimmedMention)}\\s+\\/approve\\s+(req-[a-z0-9-]{4,})(?=$|\\s|[.!?])`, "i");
}
function encodeApprovalMarkerPayload(data) {
    return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}
function decodeApprovalMarkerPayload(payload) {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json);
}
/**
 * Encodes workflow dispatch metadata into a hidden HTML marker inside a comment.
 */
function buildApprovalRequestMarker(data) {
    return `<!-- sepo-agent-request base64:${encodeApprovalMarkerPayload(data)} -->`;
}
/**
 * Parses the hidden approval marker from a comment body when present.
 */
function parseApprovalRequestMarker(body) {
    const text = String(body || "");
    const encodedMatch = text.match(APPROVAL_MARKER_RE);
    try {
        return encodedMatch ? decodeApprovalMarkerPayload(encodedMatch[1]) : null;
    }
    catch {
        return null;
    }
}
/**
 * Reports whether the approval-request comment has already been resolved.
 */
function isApprovalRequestAlreadySatisfied(body) {
    return APPROVAL_STATUS_RE.test(String(body || ""));
}
/**
 * Reports whether a comment is an agent-managed approval request/status comment.
 */
function isAgentApprovalComment(body) {
    const text = String(body || "");
    return parseApprovalRequestMarker(text) !== null || isApprovalRequestAlreadySatisfied(text);
}
/**
 * Appends a human-readable approval note and a hidden satisfied marker.
 */
function markApprovalRequestSatisfied(body, approver, extra) {
    const action = extra?.workflow
        ? `\`${extra.route || "follow-up"}\` via \`${extra.workflow}\``
        : `\`${extra?.route || "follow-up"}\``;
    const trackingParts = [];
    if (extra?.issueUrl) {
        const issueNum = extra.issueUrl.match(/#?(\d+)$/)?.[1];
        trackingParts.push(issueNum ? `#${issueNum}` : extra.issueUrl);
    }
    if (extra?.runUrl) {
        trackingParts.push(`[approval run](${extra.runUrl})`);
    }
    const tracking = trackingParts.length > 0 ? trackingParts.join(", ") : "\u2014";
    const table = [
        "| Approved by | Action | Tracking |",
        "|---|---|---|",
        `| @${approver} | ${action} | ${tracking} |`,
    ].join("\n");
    return `${String(body || "").trim()}\n\n${table}\n\n<!-- sepo-agent-approved -->\n`;
}
/**
 * Matches explicit approval commands understood by the portal.
 */
function isApprovalCommand(body, mention = context_js_1.DEFAULT_MENTION) {
    return parseApprovalCommand(body, mention) !== null;
}
/**
 * Parses an approval command and extracts the referenced request ID.
 */
function parseApprovalCommand(body, mention = context_js_1.DEFAULT_MENTION) {
    const commandRe = buildApprovalCommandRegex(mention);
    if (!commandRe)
        return null;
    const match = (0, mentions_js_1.stripNonLiveMentions)(String(body || "")).match(commandRe);
    if (!match)
        return null;
    return { requestId: match[1].toLowerCase() };
}
/**
 * Finds a specific unresolved approval request comment by request ID.
 */
function findPendingRequestById(comments, requestId) {
    for (const comment of comments) {
        const request = parseApprovalRequestMarker(comment.body || "");
        if (!request)
            continue;
        if (String(request.request_id || "").toLowerCase() !== requestId.toLowerCase()) {
            continue;
        }
        if (isApprovalRequestAlreadySatisfied(comment.body || ""))
            continue;
        return {
            comment: {
                id: comment.id ?? "",
                body: comment.body || "",
                created_at: comment.created_at || "",
            },
            request,
        };
    }
    return null;
}
/**
 * Reports whether approving this request requires creating a new tracking
 * issue first. Implementation-like requests from non-issue surfaces should do that.
 */
function shouldCreateIssueFromApprovalRequest(request) {
    return ((request?.route === "implement" || request?.route === "create-action") &&
        request?.target_kind !== "issue" &&
        String(request?.issue_title || "").trim() !== "");
}
//# sourceMappingURL=approval.js.map