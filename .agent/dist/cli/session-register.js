"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envelope_js_1 = require("../envelope.js");
const git_js_1 = require("../git.js");
const output_js_1 = require("../output.js");
const session_bundle_js_1 = require("../session-bundle.js");
const session_policy_js_1 = require("../session-policy.js");
const thread_state_js_1 = require("../thread-state.js");
function buildThreadStateOptions() {
    const opts = { repo: process.env.GITHUB_REPOSITORY || "" };
    const token = process.env.INPUT_GITHUB_TOKEN || process.env.GH_TOKEN || "";
    if (token)
        opts.token = token;
    return opts;
}
const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
const repoSlug = process.env.GITHUB_REPOSITORY || "";
const route = process.env.ROUTE || "";
const targetKind = process.env.TARGET_KIND || "";
const targetNumber = Number(process.env.TARGET_NUMBER || "0");
const lane = process.env.LANE || "default";
const artifactId = process.env.SESSION_BUNDLE_ARTIFACT_ID || "";
const artifactName = process.env.SESSION_BUNDLE_ARTIFACT_NAME || "";
const runId = process.env.GITHUB_RUN_ID || "";
const sessionRecordId = process.env.SESSION_RECORD_ID || "";
const sessionId = process.env.SESSION_ID || "";
const policy = (0, session_policy_js_1.parseSessionPolicy)(process.env.SESSION_POLICY);
const bundleMode = (0, session_bundle_js_1.parseSessionBundleMode)(process.env.SESSION_BUNDLE_MODE);
(0, output_js_1.setOutput)("registered", "false");
if (!policy) {
    console.error("Missing or invalid SESSION_POLICY");
    process.exitCode = 2;
}
else if (!(0, session_bundle_js_1.shouldUseSessionBundles)(bundleMode, policy)) {
    process.exit(0);
}
else if (!artifactId ||
    !artifactName ||
    !repoSlug ||
    !route ||
    !targetKind ||
    !(0, session_bundle_js_1.hasValidThreadTargetNumber)(targetKind, targetNumber)) {
    console.log("No session bundle artifact metadata to register.");
}
else {
    const threadKey = (0, envelope_js_1.buildThreadKey)({
        repo_slug: repoSlug,
        route,
        target_kind: targetKind,
        target_number: targetNumber,
        lane,
    });
    const threadStateOpts = buildThreadStateOptions();
    (0, git_js_1.configureBotIdentity)(repoRoot);
    const state = (0, thread_state_js_1.getThreadState)(threadKey, repoRoot, threadStateOpts);
    if (!state) {
        console.log("No thread state found while registering session bundle; skipping.");
    }
    else if ((sessionId && state.acpxSessionId !== sessionId) ||
        (sessionRecordId && state.acpxRecordId !== sessionRecordId)) {
        console.log("Thread state session identity no longer matches the uploaded bundle; skipping registration.");
    }
    else {
        (0, thread_state_js_1.markThreadBundleStored)(threadKey, repoRoot, {
            session_bundle_backend: "github-artifact",
            session_bundle_artifact_id: artifactId,
            session_bundle_artifact_name: artifactName,
            session_bundle_run_id: runId,
        }, threadStateOpts);
        (0, output_js_1.setOutput)("registered", "true");
    }
}
//# sourceMappingURL=session-register.js.map