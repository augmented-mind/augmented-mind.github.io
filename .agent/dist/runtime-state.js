"use strict";
// Pure helpers for the runtime thread-state state machine.
//
// These helpers are intentionally side-effect free so tests can validate
// session continuity behavior without shelling out to git or acpx.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeSessionIdFromState = resumeSessionIdFromState;
exports.resumeSessionIdFromForkSource = resumeSessionIdFromForkSource;
exports.shouldUseContinuationPrompt = shouldUseContinuationPrompt;
exports.buildRunningThreadStateFields = buildRunningThreadStateFields;
exports.buildThreadStateFieldsFromEnsureOutcome = buildThreadStateFieldsFromEnsureOutcome;
exports.buildCompletedThreadStateUpdates = buildCompletedThreadStateUpdates;
exports.buildFailedThreadStateUpdates = buildFailedThreadStateUpdates;
exports.shouldFailRunBecauseOfEnsureOutcome = shouldFailRunBecauseOfEnsureOutcome;
exports.shouldFailRunBecauseOfThreadStateError = shouldFailRunBecauseOfThreadStateError;
exports.shouldFailBecauseRequiredResumeIdentityMissing = shouldFailBecauseRequiredResumeIdentityMissing;
const session_policy_js_1 = require("./session-policy.js");
function resumeSessionIdFromState(policy, state) {
    if (!(0, session_policy_js_1.attemptsResume)(policy)) {
        return undefined;
    }
    return state?.acpxSessionId || undefined;
}
function resumeSessionIdFromForkSource(policy, existingState, forkAcpxSessionId) {
    if (!(0, session_policy_js_1.attemptsResume)(policy) || existingState?.acpxSessionId) {
        return undefined;
    }
    const normalized = String(forkAcpxSessionId || "").trim();
    return normalized || undefined;
}
function shouldUseContinuationPrompt(existingState, resumeSessionId) {
    return Boolean(existingState?.acpxSessionId && resumeSessionId === existingState.acpxSessionId);
}
function buildRunningThreadStateFields() {
    return {
        resume_status: "not_attempted",
        last_resume_error: "",
        resumed_from_session_id: "",
    };
}
function buildThreadStateFieldsFromEnsureOutcome(outcome) {
    switch (outcome.kind) {
        case "resumed":
            return {
                resume_status: "resumed",
                last_resume_error: "",
                resumed_from_session_id: outcome.resumedFromSessionId,
            };
        case "resume_fallback":
            return {
                resume_status: "fallback_fresh",
                last_resume_error: outcome.error,
                resumed_from_session_id: outcome.resumedFromSessionId,
            };
        case "failed":
            return {
                resume_status: "failed",
                last_resume_error: outcome.error,
                resumed_from_session_id: outcome.resumedFromSessionId || "",
            };
        case "fresh":
        case "not_applicable":
        default:
            return buildRunningThreadStateFields();
    }
}
function buildCompletedThreadStateUpdates(args) {
    const updates = {
        ...buildThreadStateFieldsFromEnsureOutcome(args.outcome),
    };
    if (args.identity) {
        updates.acpxRecordId = args.identity.acpxRecordId;
        updates.acpxSessionId = args.identity.acpxSessionId;
    }
    return updates;
}
function buildFailedThreadStateUpdates(outcome) {
    return buildThreadStateFieldsFromEnsureOutcome(outcome);
}
function shouldFailRunBecauseOfEnsureOutcome(policy, outcome) {
    if (!(0, session_policy_js_1.requiresResumeContinuity)(policy)) {
        return false;
    }
    return outcome.kind === "resume_fallback" || outcome.kind === "failed";
}
function shouldFailRunBecauseOfThreadStateError(policy) {
    return (0, session_policy_js_1.requiresResumeContinuity)(policy);
}
function shouldFailBecauseRequiredResumeIdentityMissing(policy, existingState, resumeSessionId) {
    return (0, session_policy_js_1.requiresResumeContinuity)(policy) && existingState !== null && !resumeSessionId;
}
//# sourceMappingURL=runtime-state.js.map