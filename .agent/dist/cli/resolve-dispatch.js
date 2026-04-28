"use strict";
// CLI: apply dispatch policy to agent triage output.
// Usage: node .agent/dist/cli/resolve-dispatch.js
// Env: RESPONSE_FILE, TARGET_KIND, AUTHOR_ASSOCIATION, REQUESTED_ROUTE, REQUEST_TEXT,
//      REQUESTED_SKILL, ACCESS_POLICY, REPOSITORY_PRIVATE
// Outputs: route, needs_approval, confidence, summary, issue_title, issue_body,
//          skill
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const access_policy_js_1 = require("../access-policy.js");
const output_js_1 = require("../output.js");
const triage_js_1 = require("../triage.js");
const responseFile = process.env.RESPONSE_FILE || "";
const targetKind = process.env.TARGET_KIND || "";
const authorAssociation = process.env.AUTHOR_ASSOCIATION || "";
const requestedRoute = String(process.env.REQUESTED_ROUTE || "").trim().toLowerCase();
const requestedSkill = String(process.env.REQUESTED_SKILL || "").trim();
const requestText = process.env.REQUEST_TEXT || "";
const isPublicRepo = String(process.env.REPOSITORY_PRIVATE || "").trim().toLowerCase() === "false";
function loadAccessPolicy() {
    try {
        return (0, access_policy_js_1.parseAccessPolicy)(process.env.ACCESS_POLICY || "");
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Invalid AGENT_ACCESS_POLICY: ${msg}`);
        return null;
    }
}
function emitDecision(accessPolicy) {
    try {
        const isExplicit = Boolean(requestedRoute);
        const decision = isExplicit
            ? (0, triage_js_1.buildRequestedRouteDecision)(requestedRoute, requestText)
            : (0, triage_js_1.normalizeDispatch)(raw);
        const result = (0, triage_js_1.applyDispatchPolicy)(decision, targetKind, authorAssociation, accessPolicy, isPublicRepo, isExplicit);
        (0, output_js_1.setOutput)("route", result.route);
        (0, output_js_1.setOutput)("needs_approval", String(result.needsApproval));
        (0, output_js_1.setOutput)("confidence", result.confidence);
        (0, output_js_1.setOutput)("summary", result.summary);
        (0, output_js_1.setOutput)("issue_title", result.issueTitle);
        (0, output_js_1.setOutput)("issue_body", result.issueBody);
        (0, output_js_1.setOutput)("skill", result.route === "skill" ? requestedSkill : "");
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Dispatch resolution failed: ${msg}`);
        // Fall back to answer route on parse failure
        (0, output_js_1.setOutput)("route", "answer");
        (0, output_js_1.setOutput)("needs_approval", "false");
        (0, output_js_1.setOutput)("confidence", "low");
        (0, output_js_1.setOutput)("summary", "Could not parse dispatch response; falling back to answer.");
        (0, output_js_1.setOutput)("issue_title", "");
        (0, output_js_1.setOutput)("issue_body", "");
        (0, output_js_1.setOutput)("skill", "");
    }
}
let raw = "";
if (responseFile) {
    try {
        raw = (0, node_fs_1.readFileSync)(responseFile, "utf8");
    }
    catch {
        console.error(`Could not read response file: ${responseFile}`);
        process.exitCode = 1;
    }
}
if (requestedRoute || raw) {
    const accessPolicy = loadAccessPolicy();
    if (!accessPolicy) {
        process.exitCode = 2;
    }
    else {
        emitDecision(accessPolicy);
    }
}
//# sourceMappingURL=resolve-dispatch.js.map