"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const node_child_process_1 = require("node:child_process");
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
function setDefaultOutputs() {
    (0, output_js_1.setOutput)("restore_status", "not_applicable");
    (0, output_js_1.setOutput)("restore_error", "");
    (0, output_js_1.setOutput)("artifact_name", "");
    (0, output_js_1.setOutput)("artifact_run_id", "");
    (0, output_js_1.setOutput)("fork_restore_status", "not_attempted");
    (0, output_js_1.setOutput)("fork_restore_error", "");
    (0, output_js_1.setOutput)("fork_from_thread_key", "");
    (0, output_js_1.setOutput)("fork_acpx_session_id", "");
    (0, output_js_1.setOutput)("fork_artifact_name", "");
    (0, output_js_1.setOutput)("fork_artifact_run_id", "");
}
function setForkOutputs(args) {
    (0, output_js_1.setOutput)("fork_restore_status", args.status);
    (0, output_js_1.setOutput)("fork_restore_error", args.error || "");
    (0, output_js_1.setOutput)("fork_from_thread_key", args.threadKey || "");
    (0, output_js_1.setOutput)("fork_acpx_session_id", args.acpxSessionId || "");
    (0, output_js_1.setOutput)("fork_artifact_name", args.artifactName || "");
    (0, output_js_1.setOutput)("fork_artifact_run_id", args.artifactRunId || "");
}
function restoreArtifactBundle(args) {
    const downloadDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)(args.runnerTemp, "session-bundle-download-"));
    try {
        (0, node_child_process_1.execFileSync)("gh", [
            "run",
            "download",
            args.artifactRunId,
            "--repo",
            args.repoSlug,
            "-n",
            args.artifactName,
            "-D",
            downloadDir,
        ], {
            cwd: args.repoRoot,
            env: process.env,
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 20 * 1024 * 1024,
        });
        const bundlePath = (0, session_bundle_js_1.findSessionBundleArchive)(downloadDir);
        if (!bundlePath) {
            throw new Error(`Artifact ${args.artifactName} did not contain a .tgz bundle`);
        }
        (0, session_bundle_js_1.restoreSessionBundle)(bundlePath, args.homeDir);
    }
    finally {
        (0, node_fs_1.rmSync)(downloadDir, { recursive: true, force: true });
    }
}
function tryRestoreDestination(args) {
    const artifactName = args.state?.session_bundle_artifact_name || "";
    const artifactRunId = args.state?.session_bundle_run_id || "";
    if (!artifactName || !artifactRunId) {
        (0, thread_state_js_1.markThreadBundleRestore)(args.threadKey, args.repoRoot, { bundle_restore_status: "not_available", last_bundle_restore_error: "" }, args.threadStateOpts);
        (0, output_js_1.setOutput)("restore_status", "not_available");
        return "not_available";
    }
    try {
        restoreArtifactBundle({
            repoSlug: args.repoSlug,
            repoRoot: args.repoRoot,
            runnerTemp: args.runnerTemp,
            homeDir: args.homeDir,
            artifactName,
            artifactRunId,
        });
        (0, thread_state_js_1.markThreadBundleRestore)(args.threadKey, args.repoRoot, { bundle_restore_status: "restored", last_bundle_restore_error: "" }, args.threadStateOpts);
        (0, output_js_1.setOutput)("restore_status", "restored");
        (0, output_js_1.setOutput)("artifact_name", artifactName);
        (0, output_js_1.setOutput)("artifact_run_id", artifactRunId);
        return "restored";
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        (0, thread_state_js_1.markThreadBundleRestore)(args.threadKey, args.repoRoot, { bundle_restore_status: "failed", last_bundle_restore_error: msg }, args.threadStateOpts);
        (0, output_js_1.setOutput)("restore_status", "failed");
        (0, output_js_1.setOutput)("restore_error", msg);
        (0, output_js_1.setOutput)("artifact_name", artifactName);
        (0, output_js_1.setOutput)("artifact_run_id", artifactRunId);
        console.warn(`Session bundle restore failed: ${msg}`);
        return "failed";
    }
}
function tryRestoreForkSource(args) {
    const sourceThreadKey = String(args.sourceThreadKey || "").trim();
    if (!sourceThreadKey || sourceThreadKey === args.destinationThreadKey) {
        return;
    }
    let state = null;
    try {
        state = (0, thread_state_js_1.getThreadState)(sourceThreadKey, args.repoRoot, args.threadStateOpts);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setForkOutputs({ status: "failed", error: msg, threadKey: sourceThreadKey });
        console.warn(`Session fork source lookup failed: ${msg}`);
        return;
    }
    if (!state) {
        setForkOutputs({ status: "not_available", threadKey: sourceThreadKey });
        return;
    }
    const acpxSessionId = state.acpxSessionId || "";
    if (!acpxSessionId) {
        setForkOutputs({ status: "no_session_identity", threadKey: sourceThreadKey });
        return;
    }
    const artifactName = state.session_bundle_artifact_name || "";
    const artifactRunId = state.session_bundle_run_id || "";
    if (!artifactName || !artifactRunId) {
        setForkOutputs({
            status: "not_available",
            threadKey: sourceThreadKey,
            acpxSessionId,
        });
        return;
    }
    try {
        restoreArtifactBundle({
            repoSlug: args.repoSlug,
            repoRoot: args.repoRoot,
            runnerTemp: args.runnerTemp,
            homeDir: args.homeDir,
            artifactName,
            artifactRunId,
        });
        (0, output_js_1.setOutput)("restore_status", "restored_from_fork");
        (0, output_js_1.setOutput)("restore_error", "");
        (0, output_js_1.setOutput)("artifact_name", artifactName);
        (0, output_js_1.setOutput)("artifact_run_id", artifactRunId);
        setForkOutputs({
            status: "restored",
            threadKey: sourceThreadKey,
            acpxSessionId,
            artifactName,
            artifactRunId,
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        (0, output_js_1.setOutput)("restore_status", "failed");
        (0, output_js_1.setOutput)("restore_error", msg);
        setForkOutputs({
            status: "failed",
            error: msg,
            threadKey: sourceThreadKey,
            acpxSessionId,
            artifactName,
            artifactRunId,
        });
        console.warn(`Session fork source restore failed: ${msg}`);
    }
}
const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
const repoSlug = process.env.GITHUB_REPOSITORY || "";
const route = process.env.ROUTE || "";
const targetKind = process.env.TARGET_KIND || "";
const targetNumber = Number(process.env.TARGET_NUMBER || "0");
const lane = process.env.LANE || "default";
const homeDir = process.env.HOME || "";
const runnerTemp = process.env.RUNNER_TEMP || (0, node_os_1.tmpdir)();
const policy = (0, session_policy_js_1.parseSessionPolicy)(process.env.SESSION_POLICY);
const bundleMode = (0, session_bundle_js_1.parseSessionBundleMode)(process.env.SESSION_BUNDLE_MODE);
const forkFromThreadKey = String(process.env.SESSION_FORK_FROM_THREAD_KEY || "").trim();
setDefaultOutputs();
if (!policy) {
    console.error("Missing or invalid SESSION_POLICY");
    process.exitCode = 2;
}
else if (!repoSlug ||
    !route ||
    !targetKind ||
    !(0, session_bundle_js_1.hasValidThreadTargetNumber)(targetKind, targetNumber)) {
    console.error("Missing repo or thread identity inputs for session restore");
    process.exitCode = 2;
}
else if (!(0, session_bundle_js_1.shouldUseSessionBundles)(bundleMode, policy)) {
    (0, output_js_1.setOutput)("restore_status", "not_applicable");
    setForkOutputs({ status: "not_applicable" });
}
else {
    try {
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
        const destinationRestoreStatus = tryRestoreDestination({
            threadKey,
            state,
            repoSlug,
            repoRoot,
            runnerTemp,
            homeDir,
            threadStateOpts,
        });
        if (destinationRestoreStatus !== "restored" && !state?.acpxSessionId) {
            tryRestoreForkSource({
                sourceThreadKey: forkFromThreadKey,
                destinationThreadKey: threadKey,
                repoSlug,
                repoRoot,
                runnerTemp,
                homeDir,
                threadStateOpts,
            });
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        (0, output_js_1.setOutput)("restore_status", "failed");
        (0, output_js_1.setOutput)("restore_error", msg);
        console.warn(`Session bundle restore setup failed: ${msg}`);
    }
}
//# sourceMappingURL=session-restore.js.map