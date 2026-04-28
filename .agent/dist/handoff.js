"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAutomationMode = normalizeAutomationMode;
exports.automationModeAllowsHandoff = automationModeAllowsHandoff;
exports.normalizeConclusion = normalizeConclusion;
exports.parsePlannerDecision = parsePlannerDecision;
exports.extractReviewConclusion = extractReviewConclusion;
exports.buildHandoffDedupeKey = buildHandoffDedupeKey;
exports.buildHandoffMarker = buildHandoffMarker;
exports.parseHandoffMarker = parseHandoffMarker;
exports.getHandoffMarkerState = getHandoffMarkerState;
exports.hasHandoffMarker = hasHandoffMarker;
exports.isPendingHandoffMarkerStale = isPendingHandoffMarkerStale;
exports.formatHandoffMarkerComment = formatHandoffMarkerComment;
exports.decideHandoff = decideHandoff;
const response_js_1 = require("./response.js");
const REVIEW_TO_FIX_PR = new Set(["minor_issues", "needs_rework", "changes_requested"]);
const HANDOFF_MARKER_PREFIX = "sepo-agent-handoff";
function normalizeToken(value) {
    return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeAutomationMode(value) {
    const normalized = normalizeToken(String(value || ""));
    if (!normalized || normalized === "false") {
        return "disabled";
    }
    // Backward-compatible alias for early boolean-style automation config.
    if (normalized === "true") {
        return "heuristics";
    }
    // The built-in heuristic state machine. Use the canonical plural spelling only.
    if (normalized === "heuristics") {
        return "heuristics";
    }
    if (normalized === "agent") {
        return "agent";
    }
    return "disabled";
}
function automationModeAllowsHandoff(value) {
    return normalizeAutomationMode(value) !== "disabled";
}
function normalizeConclusion(value) {
    const normalized = normalizeToken(value);
    if (normalized === "success")
        return "success";
    if (normalized === "ship")
        return "ship";
    if (normalized === "minor_issues")
        return "minor_issues";
    if (normalized === "needs_rework")
        return "needs_rework";
    if (normalized === "changes_requested")
        return "changes_requested";
    return normalized || "unknown";
}
function normalizeAgentAction(value) {
    const normalized = normalizeToken(value);
    if (normalized === "implement")
        return "implement";
    if (normalized === "review")
        return "review";
    if (normalized === "fix_pr")
        return "fix-pr";
    return null;
}
function parsePlannerDecision(raw) {
    const json = (0, response_js_1.extractJsonObject)(raw);
    if (!json)
        return null;
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch {
        return null;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return null;
    const record = parsed;
    const decisionToken = normalizeToken(String(record.decision || ""));
    const decision = decisionToken === "handoff"
        ? "handoff"
        : decisionToken === "stop"
            ? "stop"
            : decisionToken === "blocked"
                ? "blocked"
                : null;
    if (!decision)
        return null;
    const nextAction = normalizeAgentAction(String(record.next_action ?? record.nextAction ?? ""));
    const reason = String(record.reason || "").trim();
    const handoffContext = String(record.handoff_context ?? record.handoffContext ?? "").trim();
    const plannerDecision = {
        decision,
        nextAction: nextAction || undefined,
        reason: reason || "agent planner returned no reason",
    };
    if (handoffContext) {
        plannerDecision.handoffContext = handoffContext;
    }
    return plannerDecision;
}
function extractReviewConclusion(markdown) {
    const text = markdown || "";
    const verdictMatch = text.match(/##\s*Final Verdict\s*\n+\s*[-*]?\s*`?([A-Z_ -]+)`?/i);
    if (verdictMatch)
        return normalizeConclusion(verdictMatch[1]);
    const inlineMatch = text.match(/\b(SHIP|MINOR[_ -]ISSUES|NEEDS[_ -]REWORK|CHANGES[_ -]REQUESTED)\b/i);
    return inlineMatch ? normalizeConclusion(inlineMatch[1]) : "unknown";
}
function buildHandoffDedupeKey(input) {
    return [
        "handoff",
        input.repo.trim().toLowerCase(),
        input.sourceRunId.trim() || "unknown-run",
        normalizeToken(input.sourceAction),
        input.sourceTargetNumber.trim(),
        normalizeToken(input.nextAction),
        input.nextTargetNumber.trim(),
        String(input.nextRound),
    ].join(":");
}
function encodeMarkerKey(key) {
    return Buffer.from(key, "utf8").toString("base64url");
}
function buildHandoffMarker(key, state = "dispatched", createdAtMs = Date.now()) {
    return `<!-- ${HANDOFF_MARKER_PREFIX} state:${state} created:${Math.trunc(createdAtMs)} base64:${encodeMarkerKey(key)} -->`;
}
function parseHandoffMarker(body, key) {
    const encoded = escapeRegex(encodeMarkerKey(key));
    const markerRe = new RegExp(`<!--\\s*${HANDOFF_MARKER_PREFIX}(?:\\s+state:(pending|dispatched|failed))?(?:\\s+created:(\\d+))?\\s+base64:${encoded}\\s*-->`, "i");
    const match = String(body || "").match(markerRe);
    if (!match)
        return null;
    const rawState = String(match[1] || "dispatched").toLowerCase();
    const state = rawState === "pending" || rawState === "failed"
        ? rawState
        : "dispatched";
    const createdAtMs = match[2] ? Number.parseInt(match[2], 10) : NaN;
    return {
        state,
        createdAtMs: Number.isFinite(createdAtMs) && createdAtMs > 0 ? createdAtMs : null,
    };
}
function getHandoffMarkerState(body, key) {
    return parseHandoffMarker(body, key)?.state ?? null;
}
function hasHandoffMarker(body, key) {
    return parseHandoffMarker(body, key) !== null;
}
function isPendingHandoffMarkerStale(marker, nowMs, ttlMs) {
    if (marker.state !== "pending")
        return false;
    if (!marker.createdAtMs)
        return true;
    return marker.createdAtMs + ttlMs <= nowMs;
}
function formatHandoffMarkerComment(args) {
    const state = args.state || "dispatched";
    const status = state === "pending"
        ? "pending"
        : state === "failed"
            ? "failed"
            : "dispatched";
    const lines = [
        `Sepo automation handoff ${status}: \`${args.sourceAction}\` -> \`${args.nextAction}\` (round ${args.nextRound}/${args.maxRounds}).`,
        "",
        args.reason,
    ];
    if (args.error) {
        lines.push("", `Error: ${args.error}`);
    }
    lines.push("", buildHandoffMarker(args.key, state, args.createdAtMs));
    return lines.join("\n");
}
function decideHeuristicHandoff(input) {
    const nextRound = input.currentRound + 1;
    const sourceAction = normalizeToken(input.sourceAction);
    const conclusion = normalizeConclusion(input.sourceConclusion);
    const nextTarget = (input.nextTargetNumber || input.targetNumber).trim();
    if (sourceAction === "implement") {
        if (conclusion !== "success") {
            return { decision: "stop", reason: `implement concluded ${conclusion}`, nextRound };
        }
        if (!input.nextTargetNumber?.trim()) {
            return { decision: "stop", reason: "implement did not produce a pull request target", nextRound };
        }
        return {
            decision: "dispatch",
            nextAction: "review",
            targetNumber: nextTarget,
            reason: "implementation succeeded; dispatching review",
            nextRound,
        };
    }
    if (sourceAction === "fix_pr") {
        if (conclusion !== "success") {
            return { decision: "stop", reason: `fix-pr concluded ${conclusion}`, nextRound };
        }
        return {
            decision: "dispatch",
            nextAction: "review",
            targetNumber: nextTarget,
            reason: "PR fixes succeeded; dispatching review",
            nextRound,
        };
    }
    if (sourceAction === "review") {
        if (conclusion === "ship") {
            return { decision: "stop", reason: "review verdict is SHIP", nextRound };
        }
        if (REVIEW_TO_FIX_PR.has(conclusion)) {
            return {
                decision: "dispatch",
                nextAction: "fix-pr",
                targetNumber: nextTarget,
                reason: `review verdict is ${conclusion}; dispatching fix-pr`,
                nextRound,
            };
        }
        return { decision: "stop", reason: `review verdict ${conclusion} has no handoff`, nextRound };
    }
    return { decision: "stop", reason: `unsupported source action ${input.sourceAction}`, nextRound };
}
function decideAgentHandoff(input) {
    const nextRound = input.currentRound + 1;
    const plannerDecision = input.plannerDecision;
    if (!plannerDecision) {
        return { decision: "stop", reason: "agent planner decision missing or invalid", nextRound };
    }
    if (plannerDecision.decision === "stop" || plannerDecision.decision === "blocked") {
        return {
            decision: "stop",
            reason: `agent planner ${plannerDecision.decision}: ${plannerDecision.reason}`,
            nextRound,
        };
    }
    if (!plannerDecision.nextAction) {
        return { decision: "stop", reason: "agent planner requested handoff without next_action", nextRound };
    }
    const allowed = decideHeuristicHandoff(input);
    if (allowed.decision !== "dispatch" || !allowed.nextAction) {
        return {
            decision: "stop",
            reason: `agent planner requested ${plannerDecision.nextAction}, but policy disallows handoff: ${allowed.reason}`,
            nextRound,
        };
    }
    if (plannerDecision.nextAction !== allowed.nextAction) {
        return {
            decision: "stop",
            reason: `agent planner requested ${plannerDecision.nextAction}, but policy only allows ${allowed.nextAction}`,
            nextRound,
        };
    }
    return {
        ...allowed,
        reason: `agent planner selected ${allowed.nextAction}: ${plannerDecision.reason}`,
        handoffContext: plannerDecision.handoffContext,
    };
}
function decideHandoff(input) {
    const nextRound = input.currentRound + 1;
    const automationMode = normalizeAutomationMode(input.automationMode);
    if (automationMode === "disabled") {
        return { decision: "skip", reason: "automation mode is disabled", nextRound };
    }
    if (input.currentRound >= input.maxRounds) {
        return { decision: "stop", reason: "automation round budget exhausted", nextRound };
    }
    if (automationMode === "agent") {
        return decideAgentHandoff(input);
    }
    return decideHeuristicHandoff(input);
}
//# sourceMappingURL=handoff.js.map