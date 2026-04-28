"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envelope_js_1 = require("../envelope.js");
const output_js_1 = require("../output.js");
const session_bundle_js_1 = require("../session-bundle.js");
const session_policy_js_1 = require("../session-policy.js");
const repoSlug = process.env.GITHUB_REPOSITORY || "";
const route = process.env.ROUTE || "";
const targetKind = process.env.TARGET_KIND || "";
const targetNumber = Number(process.env.TARGET_NUMBER || "0");
const lane = process.env.LANE || "default";
const agent = process.env.ACPX_AGENT || "";
const acpxRecordId = process.env.ACPX_RECORD_ID || "";
const acpxSessionId = process.env.ACPX_SESSION_ID || "";
const runId = process.env.GITHUB_RUN_ID || "run";
const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
const homeDir = process.env.HOME || "";
const runnerTemp = process.env.RUNNER_TEMP || undefined;
const policy = (0, session_policy_js_1.parseSessionPolicy)(process.env.SESSION_POLICY);
const bundleMode = (0, session_bundle_js_1.parseSessionBundleMode)(process.env.SESSION_BUNDLE_MODE);
(0, output_js_1.setOutput)("bundle_created", "false");
(0, output_js_1.setOutput)("bundle_file", "");
(0, output_js_1.setOutput)("artifact_name", "");
(0, output_js_1.setOutput)("file_count", "0");
(0, output_js_1.setOutput)("total_size_bytes", "0");
if (!policy) {
    console.error("Missing or invalid SESSION_POLICY");
    process.exitCode = 2;
}
else if (!(0, session_bundle_js_1.shouldUseSessionBundles)(bundleMode, policy)) {
    process.exit(0);
}
else if (!repoSlug ||
    !route ||
    !targetKind ||
    !(0, session_bundle_js_1.hasValidThreadTargetNumber)(targetKind, targetNumber) ||
    !agent) {
    console.error("Missing repo identity inputs for session backup");
    process.exitCode = 2;
}
else if (!acpxRecordId || !acpxSessionId) {
    console.log("No acpx session identity was emitted; skipping session bundle backup.");
}
else {
    const threadKey = (0, envelope_js_1.buildThreadKey)({
        repo_slug: repoSlug,
        route,
        target_kind: targetKind,
        target_number: targetNumber,
        lane,
    });
    const bundle = (0, session_bundle_js_1.createSessionBundle)({
        agent,
        threadKey,
        repoSlug,
        cwd,
        acpxRecordId,
        acpxSessionId,
        homeDir,
        runnerTemp,
    });
    if (!bundle) {
        console.log("No session files discovered for backup.");
    }
    else {
        (0, output_js_1.setOutput)("bundle_created", "true");
        (0, output_js_1.setOutput)("bundle_file", bundle.bundlePath);
        (0, output_js_1.setOutput)("artifact_name", (0, session_bundle_js_1.buildSessionBundleArtifactName)(threadKey, runId));
        (0, output_js_1.setOutput)("file_count", String(bundle.fileCount));
        (0, output_js_1.setOutput)("total_size_bytes", String(bundle.totalSizeBytes));
    }
}
//# sourceMappingURL=session-backup.js.map