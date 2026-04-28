"use strict";
// CLI: post-action handoff orchestrator.
// Env: AUTOMATION_MODE, SOURCE_ACTION, SOURCE_CONCLUSION, TARGET_NUMBER,
//      NEXT_TARGET_NUMBER, AUTOMATION_CURRENT_ROUND, AUTOMATION_MAX_ROUNDS,
//      GITHUB_REPOSITORY, DEFAULT_BRANCH, REQUESTED_BY, REQUEST_TEXT,
//      SESSION_BUNDLE_MODE, SOURCE_RUN_ID, PLANNER_RESPONSE_FILE
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const github_js_1 = require("../github.js");
const output_js_1 = require("../output.js");
const handoff_js_1 = require("../handoff.js");
const PENDING_MARKER_TTL_MS = 60 * 60 * 1000;
function positiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function parsePositiveTargetNumber(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
function errorText(err) {
    const record = err;
    return [record.message, record.stderr, record.stdout]
        .map((part) => {
        if (Buffer.isBuffer(part))
            return part.toString("utf8");
        return typeof part === "string" ? part : "";
    })
        .filter(Boolean)
        .join("\n") || String(err);
}
function normalizeCommentRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const record = value;
    return { id: record.id, body: String(record.body || "") };
}
function fetchIssueComments(repo, issueNumber) {
    const raw = (0, github_js_1.gh)([
        "api",
        "--paginate",
        "--slurp",
        `repos/${repo}/issues/${issueNumber}/comments`,
    ]).trim();
    if (!raw)
        return [];
    const parsed = JSON.parse(raw);
    const pages = Array.isArray(parsed) ? parsed : [parsed];
    const comments = [];
    for (const page of pages) {
        const entries = Array.isArray(page) ? page : [page];
        for (const entry of entries) {
            const comment = normalizeCommentRecord(entry);
            if (comment)
                comments.push(comment);
        }
    }
    return comments;
}
function findHandoffMarkers(repo, issueNumber, dedupeKey) {
    return fetchIssueComments(repo, issueNumber)
        .map((comment) => {
        const parsed = (0, handoff_js_1.parseHandoffMarker)(comment.body || "", dedupeKey);
        if (!parsed)
            return null;
        return {
            id: String(comment.id || ""),
            ...parsed,
        };
    })
        .filter((marker) => Boolean(marker?.id));
}
function createIssueComment(repo, issueNumber, body) {
    return (0, github_js_1.gh)([
        "api",
        "--method",
        "POST",
        `repos/${repo}/issues/${issueNumber}/comments`,
        "-f",
        `body=${body}`,
        "--jq",
        ".id",
    ]).trim();
}
function updateIssueComment(repo, commentId, body) {
    (0, github_js_1.gh)([
        "api",
        "--method",
        "PATCH",
        `repos/${repo}/issues/comments/${commentId}`,
        "-f",
        `body=${body}`,
    ]);
}
const repo = process.env.GITHUB_REPOSITORY || "";
const ref = process.env.DEFAULT_BRANCH || "";
const sourceAction = process.env.SOURCE_ACTION || "";
const sourceConclusion = process.env.SOURCE_CONCLUSION || "unknown";
const sourceRunId = process.env.SOURCE_RUN_ID || process.env.GITHUB_RUN_ID || "";
const targetNumber = process.env.TARGET_NUMBER || "";
const requestedBy = process.env.REQUESTED_BY || "";
const requestText = process.env.REQUEST_TEXT || "";
const sessionBundleMode = process.env.SESSION_BUNDLE_MODE || "";
const maxRounds = positiveInt(process.env.AUTOMATION_MAX_ROUNDS || "", 5);
const currentRound = positiveInt(process.env.AUTOMATION_CURRENT_ROUND || "", 1);
const automationMode = (0, handoff_js_1.normalizeAutomationMode)(process.env.AUTOMATION_MODE || "disabled");
function readPlannerDecision() {
    const responseFile = process.env.PLANNER_RESPONSE_FILE || "";
    if (!responseFile)
        return null;
    try {
        return (0, handoff_js_1.parsePlannerDecision)((0, node_fs_1.readFileSync)(responseFile, "utf8"));
    }
    catch {
        return null;
    }
}
const decision = (0, handoff_js_1.decideHandoff)({
    automationMode,
    sourceAction,
    sourceConclusion,
    targetNumber,
    nextTargetNumber: process.env.NEXT_TARGET_NUMBER || "",
    currentRound,
    maxRounds,
    plannerDecision: automationMode === "agent" ? readPlannerDecision() : null,
});
(0, output_js_1.setOutput)("decision", decision.decision);
(0, output_js_1.setOutput)("next_action", decision.nextAction || "");
(0, output_js_1.setOutput)("target_number", decision.targetNumber || "");
(0, output_js_1.setOutput)("reason", decision.reason);
(0, output_js_1.setOutput)("next_round", String(decision.nextRound));
(0, output_js_1.setOutput)("handoff_context", decision.handoffContext || "");
(0, output_js_1.setOutput)("deduped", "false");
(0, output_js_1.setOutput)("dedupe_key", "");
(0, output_js_1.setOutput)("marker_comment_id", "");
if (decision.decision !== "dispatch") {
    console.log(`Handoff ${decision.decision}: ${decision.reason}`);
    process.exit(0);
}
if (!repo || !ref || !decision.nextAction || !decision.targetNumber) {
    console.error("Missing required dispatch context for handoff");
    process.exit(2);
}
const dedupeKey = (0, handoff_js_1.buildHandoffDedupeKey)({
    repo,
    sourceRunId,
    sourceAction,
    sourceTargetNumber: targetNumber,
    nextAction: decision.nextAction,
    nextTargetNumber: decision.targetNumber,
    nextRound: decision.nextRound,
});
(0, output_js_1.setOutput)("dedupe_key", dedupeKey);
const markerTargetNumber = parsePositiveTargetNumber(decision.targetNumber);
if (!markerTargetNumber) {
    console.error(`Invalid handoff marker target number: ${decision.targetNumber}`);
    process.exit(2);
}
const existingMarkers = findHandoffMarkers(repo, markerTargetNumber, dedupeKey);
const nowMs = Date.now();
const activeMarker = existingMarkers.find((marker) => (marker.state === "dispatched" ||
    (marker.state === "pending" && !(0, handoff_js_1.isPendingHandoffMarkerStale)(marker, nowMs, PENDING_MARKER_TTL_MS))));
if (activeMarker) {
    (0, output_js_1.setOutput)("deduped", "true");
    (0, output_js_1.setOutput)("marker_comment_id", activeMarker.id);
    console.log(`Skipping duplicate handoff ${dedupeKey} (${activeMarker.state})`);
    process.exit(0);
}
for (const staleMarker of existingMarkers.filter((marker) => (0, handoff_js_1.isPendingHandoffMarkerStale)(marker, nowMs, PENDING_MARKER_TTL_MS))) {
    try {
        updateIssueComment(repo, staleMarker.id, (0, handoff_js_1.formatHandoffMarkerComment)({
            key: dedupeKey,
            state: "failed",
            sourceAction,
            nextAction: decision.nextAction,
            nextRound: decision.nextRound,
            maxRounds,
            reason: decision.reason,
            error: "Pending handoff marker expired before dispatch completed; retrying handoff.",
        }));
    }
    catch (err) {
        console.warn(`Failed to expire stale pending handoff marker ${staleMarker.id}: ${errorText(err)}`);
    }
}
const pendingBody = (0, handoff_js_1.formatHandoffMarkerComment)({
    key: dedupeKey,
    state: "pending",
    sourceAction,
    nextAction: decision.nextAction,
    nextRound: decision.nextRound,
    maxRounds,
    reason: decision.reason,
    createdAtMs: nowMs,
});
const markerCommentId = createIssueComment(repo, markerTargetNumber, pendingBody);
(0, output_js_1.setOutput)("marker_comment_id", markerCommentId);
const commonInputs = {
    requested_by: requestedBy,
    request_text: requestText,
    automation_mode: automationMode,
    automation_current_round: String(decision.nextRound),
    automation_max_rounds: String(maxRounds),
    session_bundle_mode: sessionBundleMode,
};
try {
    if (decision.nextAction === "review") {
        (0, github_js_1.dispatchWorkflow)(repo, "agent-review.yml", ref, {
            ...commonInputs,
            pr_number: decision.targetNumber,
        });
    }
    else if (decision.nextAction === "fix-pr") {
        (0, github_js_1.dispatchWorkflow)(repo, "agent-fix-pr.yml", ref, {
            ...commonInputs,
            pr_number: decision.targetNumber,
            request_source_kind: "workflow_dispatch",
            orchestrator_context: decision.handoffContext || "",
        });
    }
    else {
        console.error(`Unsupported next action: ${decision.nextAction}`);
        process.exit(2);
    }
}
catch (err) {
    const message = errorText(err).slice(0, 1000);
    try {
        updateIssueComment(repo, markerCommentId, (0, handoff_js_1.formatHandoffMarkerComment)({
            key: dedupeKey,
            state: "failed",
            sourceAction,
            nextAction: decision.nextAction,
            nextRound: decision.nextRound,
            maxRounds,
            reason: decision.reason,
            error: message,
        }));
    }
    catch (updateErr) {
        console.warn(`Failed to mark handoff ${dedupeKey} as failed: ${errorText(updateErr)}`);
    }
    throw err;
}
try {
    updateIssueComment(repo, markerCommentId, (0, handoff_js_1.formatHandoffMarkerComment)({
        key: dedupeKey,
        state: "dispatched",
        sourceAction,
        nextAction: decision.nextAction,
        nextRound: decision.nextRound,
        maxRounds,
        reason: decision.reason,
    }));
}
catch (err) {
    console.warn(`Handoff dispatched but marker ${markerCommentId} remained pending: ${errorText(err)}`);
}
console.log(`Handoff dispatched ${decision.nextAction} for #${decision.targetNumber}: ${decision.reason}`);
//# sourceMappingURL=orchestrate-handoff.js.map