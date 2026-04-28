"use strict";
// Parses AGENT_SCHEDULE_POLICY, the repository-level configuration for
// scheduled workflow runs.
//
// Shape (both sections optional):
//   {
//     "default_mode": "always_run" | "skip_no_updates" | "disabled",
//     "workflow_overrides": {
//       "<workflow filename>": "always_run" | "skip_no_updates" | "disabled",
//       ...
//     }
//   }
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCHEDULE_WORKFLOW_OVERRIDES = exports.DEFAULT_SCHEDULE_MODE = exports.SCHEDULE_MODES = void 0;
exports.parseSchedulePolicy = parseSchedulePolicy;
exports.getScheduleModeForWorkflow = getScheduleModeForWorkflow;
exports.isScheduleMode = isScheduleMode;
exports.SCHEDULE_MODES = ["always_run", "skip_no_updates", "disabled"];
exports.DEFAULT_SCHEDULE_MODE = "skip_no_updates";
exports.DEFAULT_SCHEDULE_WORKFLOW_OVERRIDES = {
    "agent-memory-sync.yml": "always_run",
};
const VALID_MODE_SET = new Set(exports.SCHEDULE_MODES);
const VALID_WORKFLOW_KEY = /^[a-z0-9][a-z0-9._-]*\.ya?ml$/;
function normalizeMode(value, label) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!VALID_MODE_SET.has(normalized)) {
        throw new Error(`${label} must be one of ${exports.SCHEDULE_MODES.join(", ")} (got ${normalized || "empty"})`);
    }
    return normalized;
}
function normalizeWorkflow(value) {
    return String(value || "").trim().toLowerCase();
}
function parseSchedulePolicy(raw) {
    const text = String(raw || "").trim();
    if (!text) {
        return {
            defaultMode: exports.DEFAULT_SCHEDULE_MODE,
            workflowOverrides: { ...exports.DEFAULT_SCHEDULE_WORKFLOW_OVERRIDES },
        };
    }
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Schedule policy must be a JSON object");
    }
    const policy = {
        defaultMode: exports.DEFAULT_SCHEDULE_MODE,
        workflowOverrides: {},
    };
    if ("default_mode" in payload) {
        policy.defaultMode = normalizeMode(payload.default_mode, "default_mode");
    }
    if ("workflow_overrides" in payload) {
        const overrides = payload.workflow_overrides;
        if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
            throw new Error("workflow_overrides must be an object");
        }
        for (const [workflow, mode] of Object.entries(overrides)) {
            const normalizedWorkflow = normalizeWorkflow(workflow);
            if (!VALID_WORKFLOW_KEY.test(normalizedWorkflow)) {
                throw new Error(`Invalid workflow override key in schedule policy: ${normalizedWorkflow || "missing"}`);
            }
            policy.workflowOverrides[normalizedWorkflow] = normalizeMode(mode, `workflow_overrides.${normalizedWorkflow}`);
        }
    }
    return policy;
}
function getScheduleModeForWorkflow(policy, workflow) {
    const normalizedWorkflow = normalizeWorkflow(workflow);
    if (normalizedWorkflow && normalizedWorkflow in policy.workflowOverrides) {
        return policy.workflowOverrides[normalizedWorkflow];
    }
    return policy.defaultMode;
}
function isScheduleMode(value) {
    return typeof value === "string" && VALID_MODE_SET.has(value);
}
//# sourceMappingURL=schedule-policy.js.map