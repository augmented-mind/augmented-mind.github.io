"use strict";
// Session continuity policy.
//
// Separates three concerns:
// 1. whether a route tracks durable thread state
// 2. whether it attempts to resume prior ACP sessions across runs
// 3. whether continuity failures are fatal or best-effort
//
// Policy is explicit in workflow YAML. We intentionally do not provide
// route-based defaults or backward-compatibility fallbacks.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSessionPolicy = parseSessionPolicy;
exports.sessionModeForPolicy = sessionModeForPolicy;
exports.tracksThreadState = tracksThreadState;
exports.attemptsResume = attemptsResume;
exports.requiresResumeContinuity = requiresResumeContinuity;
function parseSessionPolicy(value) {
    const normalized = value?.trim().toLowerCase();
    if (normalized === "none" ||
        normalized === "track-only" ||
        normalized === "resume-best-effort" ||
        normalized === "resume-required") {
        return normalized;
    }
    return null;
}
function sessionModeForPolicy(policy) {
    return policy === "none" ? "exec" : "persistent";
}
function tracksThreadState(policy) {
    return policy !== "none";
}
function attemptsResume(policy) {
    return policy === "resume-best-effort" || policy === "resume-required";
}
function requiresResumeContinuity(policy) {
    return policy === "resume-required";
}
//# sourceMappingURL=session-policy.js.map