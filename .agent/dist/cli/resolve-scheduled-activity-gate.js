#!/usr/bin/env node
"use strict";
// CLI: resolve whether a scheduled workflow should skip expensive work.
Object.defineProperty(exports, "__esModule", { value: true });
const scheduled_activity_js_1 = require("../scheduled-activity.js");
const output_js_1 = require("../output.js");
function buildOptions() {
    const repo = process.env.GITHUB_REPOSITORY || process.env.REPO_SLUG || "";
    const token = process.env.INPUT_GITHUB_TOKEN || process.env.GH_TOKEN || "";
    return { repo, token: token || undefined };
}
try {
    const result = (0, scheduled_activity_js_1.resolveScheduledActivityGate)({
        eventName: process.env.GITHUB_EVENT_NAME || "",
        schedulePolicy: process.env.AGENT_SCHEDULE_POLICY || "",
        workflow: process.env.WORKFLOW_FILENAME || "",
        activityCount: process.env.ACTIVITY_COUNT || "",
        dependencyRef: process.env.DEPENDENCY_REF || "",
        dependencyField: process.env.DEPENDENCY_FIELD || "",
        selfRef: process.env.SELF_REF || "",
        selfField: process.env.SELF_FIELD || "",
        cwd: process.env.GITHUB_WORKSPACE || process.cwd(),
        pushOptions: buildOptions(),
    });
    (0, output_js_1.setOutput)("skip", result.skip ? "true" : "false");
    (0, output_js_1.setOutput)("mode", result.mode);
    (0, output_js_1.setOutput)("reason", result.reason);
    (0, output_js_1.setOutput)("dependency_value", result.dependencyValue);
    (0, output_js_1.setOutput)("self_value", result.selfValue);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Invalid scheduled activity gate configuration: ${message}`);
    process.exitCode = 2;
}
//# sourceMappingURL=resolve-scheduled-activity-gate.js.map