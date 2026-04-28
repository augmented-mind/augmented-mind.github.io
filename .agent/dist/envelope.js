"use strict";
// Runtime envelope: the shared metadata contract that every agent route
// receives. Agents use this identity block plus self-serve tool calls
// (gh, git, local file reads) to gather the context they need.
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRED_FIELDS = exports.VALID_TARGET_KINDS = exports.VALID_SOURCE_KINDS = exports.VALID_ROUTES = exports.DEFAULT_LANE = exports.SCHEMA_VERSION = void 0;
exports.buildThreadKey = buildThreadKey;
exports.buildEnvelope = buildEnvelope;
exports.validateEnvelope = validateEnvelope;
exports.buildEnvelopeFromEventContext = buildEnvelopeFromEventContext;
exports.envelopeToPromptVars = envelopeToPromptVars;
exports.SCHEMA_VERSION = 1;
exports.DEFAULT_LANE = "default";
exports.VALID_ROUTES = new Set([
    "review",
    "implement",
    "fix-pr",
    "answer",
    "create-action",
    "dispatch",
    "orchestrator",
    "skill",
    "rubrics-review",
    "rubrics-initialization",
    "rubrics-update",
]);
exports.VALID_SOURCE_KINDS = new Set([
    "issue",
    "issue_comment",
    "pull_request",
    "pull_request_review_comment",
    "pull_request_review",
    "discussion",
    "discussion_comment",
    "workflow_dispatch",
]);
exports.VALID_TARGET_KINDS = new Set(["issue", "pull_request", "discussion", "repository"]);
exports.REQUIRED_FIELDS = [
    "repo_slug",
    "route",
    "source_kind",
    "target_kind",
    "target_number",
    "target_url",
    "requested_by",
];
function buildThreadKey(params) {
    const effectiveLane = String(params.lane || exports.DEFAULT_LANE);
    return `${params.repo_slug}:${params.target_kind}:${params.target_number}:${params.route}:${effectiveLane}`;
}
function buildEnvelope(params) {
    const envelope = {
        schema_version: exports.SCHEMA_VERSION,
        repo_slug: String(params.repo_slug || ""),
        route: String(params.route || ""),
        source_kind: String(params.source_kind || ""),
        target_kind: String(params.target_kind || ""),
        target_number: Number(params.target_number) || 0,
        target_url: String(params.target_url || ""),
        request_text: String(params.request_text || ""),
        requested_by: String(params.requested_by || ""),
        approval_comment_url: params.approval_comment_url || null,
        workflow: String(params.workflow || ""),
        lane: String(params.lane || exports.DEFAULT_LANE),
        thread_key: "",
    };
    envelope.thread_key = buildThreadKey(envelope);
    return envelope;
}
function validateEnvelope(envelope) {
    const errors = [];
    if (!envelope || typeof envelope !== "object") {
        return ["Envelope must be a non-null object"];
    }
    if (envelope.schema_version !== exports.SCHEMA_VERSION) {
        errors.push(`Unsupported schema_version: ${envelope.schema_version} (expected ${exports.SCHEMA_VERSION})`);
    }
    for (const field of exports.REQUIRED_FIELDS) {
        const value = envelope[field];
        // Repository-scoped runs (scan, sync) have no target_number; 0 is valid.
        const allowZeroTargetNumber = field === "target_number" && envelope.target_kind === "repository";
        if (value === undefined ||
            value === null ||
            value === "" ||
            (typeof value === "number" && value === 0 && !allowZeroTargetNumber)) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    if (envelope.route && !exports.VALID_ROUTES.has(envelope.route)) {
        errors.push(`Invalid route: ${envelope.route}`);
    }
    if (envelope.source_kind && !exports.VALID_SOURCE_KINDS.has(envelope.source_kind)) {
        errors.push(`Invalid source_kind: ${envelope.source_kind}`);
    }
    if (envelope.target_kind && !exports.VALID_TARGET_KINDS.has(envelope.target_kind)) {
        errors.push(`Invalid target_kind: ${envelope.target_kind}`);
    }
    return errors;
}
function buildEnvelopeFromEventContext(eventContext, runtime) {
    return buildEnvelope({
        repo_slug: runtime.repo_slug,
        route: runtime.route,
        source_kind: eventContext.sourceKind,
        target_kind: eventContext.targetKind,
        target_number: Number(eventContext.targetNumber),
        target_url: eventContext.targetUrl,
        request_text: eventContext.body,
        requested_by: runtime.requested_by,
        approval_comment_url: runtime.approval_comment_url || null,
        workflow: runtime.workflow,
        lane: runtime.lane,
    });
}
function envelopeToPromptVars(envelope) {
    return {
        REPO_SLUG: envelope.repo_slug,
        ROUTE: envelope.route,
        SOURCE_KIND: envelope.source_kind,
        TARGET_KIND: envelope.target_kind,
        TARGET_NUMBER: String(envelope.target_number),
        TARGET_URL: envelope.target_url,
        REQUEST_TEXT: envelope.request_text,
        MENTION_BODY: envelope.request_text,
        REQUESTED_BY: envelope.requested_by,
        WORKFLOW: envelope.workflow,
        LANE: envelope.lane,
        THREAD_KEY: envelope.thread_key,
    };
}
//# sourceMappingURL=envelope.js.map