"use strict";
// Thread state: durable cross-run state for agent sessions.
//
// Pure data operations (types, create, update, normalize) at the top.
// Git-refs I/O at the bottom — stores state as JSON blobs in orphan
// commits under refs/agent-state/<thread-key>. O(1) reads, atomic
// writes via --force-with-lease, built-in audit trail, no comment
// pollution, works for all target kinds (issues, PRs, discussions).
//
// Ref layout:
//   refs/agent-state/<key>  →  commit  →  tree  →  state.json (blob)
Object.defineProperty(exports, "__esModule", { value: true });
exports.THREAD_STATE_SCHEMA_VERSION = void 0;
exports.createThreadState = createThreadState;
exports.updateThreadState = updateThreadState;
exports.normalizeThreadState = normalizeThreadState;
exports.threadKeyToRefName = threadKeyToRefName;
exports.refPathForThreadKey = refPathForThreadKey;
exports.fetchThreadState = fetchThreadState;
exports.writeThreadState = writeThreadState;
exports.getThreadState = getThreadState;
exports.markThreadRunning = markThreadRunning;
exports.markThreadCompleted = markThreadCompleted;
exports.markThreadFailed = markThreadFailed;
exports.markThreadBundleRestore = markThreadBundleRestore;
exports.markThreadBundleStored = markThreadBundleStored;
const git_js_1 = require("./git.js");
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
exports.THREAD_STATE_SCHEMA_VERSION = 3;
const VALID_THREAD_STATUSES = new Set([
    "pending",
    "running",
    "completed",
    "failed",
]);
const VALID_RESUME_STATUSES = new Set([
    "not_attempted",
    "resumed",
    "fallback_fresh",
    "failed",
]);
const VALID_BUNDLE_RESTORE_STATUSES = new Set([
    "not_attempted",
    "not_available",
    "restored",
    "restored_from_fork",
    "failed",
]);
// ---------------------------------------------------------------------------
// Pure data operations
// ---------------------------------------------------------------------------
function createThreadState(threadKey) {
    const now = new Date().toISOString();
    return {
        schema_version: exports.THREAD_STATE_SCHEMA_VERSION,
        thread_key: threadKey,
        acpxRecordId: "",
        acpxSessionId: "",
        agentSessionId: "",
        branch: "",
        status: "pending",
        resume_status: "not_attempted",
        last_resume_error: "",
        resumed_from_session_id: "",
        session_bundle_backend: "",
        session_bundle_artifact_id: "",
        session_bundle_artifact_name: "",
        session_bundle_run_id: "",
        bundle_restore_status: "not_attempted",
        last_bundle_restore_error: "",
        forked_from_thread_key: "",
        forked_from_acpx_session_id: "",
        last_run_url: "",
        last_comment_url: "",
        attempt_count: 0,
        created_at: now,
        updated_at: now,
    };
}
function updateThreadState(state, updates) {
    return {
        ...state,
        ...updates,
        schema_version: state.schema_version,
        thread_key: state.thread_key,
        created_at: state.created_at,
        updated_at: new Date().toISOString(),
    };
}
function toStringOrEmpty(value) {
    return typeof value === "string" ? value : "";
}
function toIsoOrNow(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
}
function toPositiveIntOrZero(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}
/**
 * Normalizes persisted thread state, including legacy pre-schema-v3 data.
 * Legacy `status: "resume_failed"` is upgraded to:
 * - `status: "failed"`
 * - `resume_status: "failed"`
 */
function normalizeThreadState(raw, fallbackThreadKey) {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const record = raw;
    const now = new Date().toISOString();
    const threadKey = (typeof record.thread_key === "string" && record.thread_key) ||
        fallbackThreadKey ||
        "";
    if (!threadKey) {
        return null;
    }
    const rawStatus = typeof record.status === "string" ? record.status : "pending";
    const status = VALID_THREAD_STATUSES.has(rawStatus)
        ? rawStatus
        : rawStatus === "resume_failed"
            ? "failed"
            : "pending";
    const resumeStatus = VALID_RESUME_STATUSES.has(record.resume_status)
        ? record.resume_status
        : rawStatus === "resume_failed"
            ? "failed"
            : "not_attempted";
    const bundleRestoreStatus = VALID_BUNDLE_RESTORE_STATUSES.has(record.bundle_restore_status)
        ? record.bundle_restore_status
        : "not_attempted";
    return {
        schema_version: exports.THREAD_STATE_SCHEMA_VERSION,
        thread_key: threadKey,
        acpxRecordId: toStringOrEmpty(record.acpxRecordId),
        acpxSessionId: toStringOrEmpty(record.acpxSessionId),
        agentSessionId: toStringOrEmpty(record.agentSessionId),
        branch: toStringOrEmpty(record.branch),
        status,
        resume_status: resumeStatus,
        last_resume_error: toStringOrEmpty(record.last_resume_error),
        resumed_from_session_id: toStringOrEmpty(record.resumed_from_session_id),
        session_bundle_backend: toStringOrEmpty(record.session_bundle_backend),
        session_bundle_artifact_id: toStringOrEmpty(record.session_bundle_artifact_id),
        session_bundle_artifact_name: toStringOrEmpty(record.session_bundle_artifact_name),
        session_bundle_run_id: toStringOrEmpty(record.session_bundle_run_id),
        bundle_restore_status: bundleRestoreStatus,
        last_bundle_restore_error: toStringOrEmpty(record.last_bundle_restore_error),
        forked_from_thread_key: toStringOrEmpty(record.forked_from_thread_key),
        forked_from_acpx_session_id: toStringOrEmpty(record.forked_from_acpx_session_id),
        last_run_url: toStringOrEmpty(record.last_run_url),
        last_comment_url: toStringOrEmpty(record.last_comment_url),
        attempt_count: toPositiveIntOrZero(record.attempt_count),
        created_at: toIsoOrNow(record.created_at, now),
        updated_at: toIsoOrNow(record.updated_at, now),
    };
}
// ---------------------------------------------------------------------------
// Ref naming
// ---------------------------------------------------------------------------
const REF_PREFIX = "refs/agent-state";
const STATE_FILENAME = "state.json";
/**
 * Converts a thread_key into a safe, injective ref path component.
 * thread_key format: owner/repo:target_kind:target_number:route:lane
 *
 * Uses percent-encoding for `/` and `%` to guarantee the mapping is
 * reversible — distinct thread keys always produce distinct ref names.
 * `:` is replaced with `--` (safe since `--` cannot appear in any
 * individual field value).
 */
function threadKeyToRefName(threadKey) {
    return threadKey
        .replace(/%/g, "%25")
        .replace(/\//g, "%2F")
        .replace(/:/g, "--")
        .replace(/[^a-zA-Z0-9._%-]/g, "_");
}
function refPathForThreadKey(threadKey) {
    return `${REF_PREFIX}/${threadKeyToRefName(threadKey)}`;
}
// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
const REF_NOT_FOUND_PATTERN = /couldn't find remote ref|no matching remote head/i;
function fetchThreadState(threadKey, cwd, opts) {
    const ref = refPathForThreadKey(threadKey);
    const origin = opts?.remote ?? "origin";
    const fetchTarget = resolveRemoteTarget(origin, opts);
    try {
        (0, git_js_1.git)(["fetch", "--no-tags", fetchTarget, `+${ref}:${ref}`], cwd);
    }
    catch (err) {
        const stderr = err?.stderr?.toString("utf8") ?? String(err);
        if (REF_NOT_FOUND_PATTERN.test(stderr)) {
            return null;
        }
        throw err;
    }
    try {
        const json = (0, git_js_1.git)(["cat-file", "blob", `${ref}:${STATE_FILENAME}`], cwd);
        return normalizeThreadState(JSON.parse(json), threadKey);
    }
    catch {
        return null;
    }
}
function resolveRemoteTarget(remote, opts) {
    if (opts?.token && opts?.repo) {
        return (0, git_js_1.buildAuthUrl)(opts.token, opts.repo);
    }
    return remote;
}
function writeThreadState(threadKey, state, cwd, opts) {
    const ref = refPathForThreadKey(threadKey);
    const origin = opts?.remote ?? "origin";
    const json = JSON.stringify(state, null, 2) + "\n";
    const blobSha = (0, git_js_1.git)(["hash-object", "-w", "--stdin"], cwd, json);
    const treeInput = `100644 blob ${blobSha}\t${STATE_FILENAME}\n`;
    const treeSha = (0, git_js_1.git)(["mktree"], cwd, treeInput);
    let parentArg;
    let expectedOid = null;
    try {
        const parentSha = (0, git_js_1.git)(["rev-parse", "--verify", ref], cwd);
        parentArg = ["-p", parentSha];
        expectedOid = parentSha;
    }
    catch {
        parentArg = [];
    }
    const commitMessage = `agent-state: ${state.status}/${state.resume_status} (attempt ${state.attempt_count})`;
    const commitSha = (0, git_js_1.git)(["commit-tree", treeSha, ...parentArg, "-m", commitMessage], cwd);
    (0, git_js_1.git)(["update-ref", ref, commitSha], cwd);
    const pushTarget = resolveRemoteTarget(origin, opts);
    const leaseArg = expectedOid
        ? `--force-with-lease=${ref}:${expectedOid}`
        : "--force";
    (0, git_js_1.git)(["push", leaseArg, pushTarget, `${ref}:${ref}`], cwd);
}
// ---------------------------------------------------------------------------
// High-level operations
// ---------------------------------------------------------------------------
function getThreadState(threadKey, cwd, opts) {
    return fetchThreadState(threadKey, cwd, opts);
}
function markThreadRunning(threadKey, cwd, updates, opts) {
    const existing = fetchThreadState(threadKey, cwd, opts);
    let state;
    if (existing) {
        state = updateThreadState(existing, {
            status: "running",
            attempt_count: existing.attempt_count + 1,
            last_run_url: updates.last_run_url ?? existing.last_run_url,
            branch: updates.branch ?? existing.branch,
            resume_status: updates.resume_status ?? "not_attempted",
            last_resume_error: updates.last_resume_error ?? "",
            resumed_from_session_id: updates.resumed_from_session_id ?? "",
            forked_from_thread_key: updates.forked_from_thread_key ?? existing.forked_from_thread_key,
            forked_from_acpx_session_id: updates.forked_from_acpx_session_id ?? existing.forked_from_acpx_session_id,
            bundle_restore_status: updates.bundle_restore_status ?? existing.bundle_restore_status,
            last_bundle_restore_error: updates.last_bundle_restore_error ?? existing.last_bundle_restore_error,
        });
    }
    else {
        state = updateThreadState(createThreadState(threadKey), {
            status: "running",
            attempt_count: 1,
            last_run_url: updates.last_run_url ?? "",
            branch: updates.branch ?? "",
            resume_status: updates.resume_status ?? "not_attempted",
            last_resume_error: updates.last_resume_error ?? "",
            resumed_from_session_id: updates.resumed_from_session_id ?? "",
            forked_from_thread_key: updates.forked_from_thread_key ?? "",
            forked_from_acpx_session_id: updates.forked_from_acpx_session_id ?? "",
            bundle_restore_status: updates.bundle_restore_status ?? "not_attempted",
            last_bundle_restore_error: updates.last_bundle_restore_error ?? "",
        });
    }
    writeThreadState(threadKey, state, cwd, opts);
    return state;
}
function markThreadCompleted(threadKey, state, cwd, updates, opts) {
    const next = updateThreadState(state, {
        ...updates,
        status: "completed",
    });
    writeThreadState(threadKey, next, cwd, opts);
    return next;
}
function markThreadFailed(threadKey, state, cwd, updates, opts) {
    const next = updateThreadState(state, {
        ...updates,
        status: "failed",
    });
    writeThreadState(threadKey, next, cwd, opts);
    return next;
}
function markThreadBundleRestore(threadKey, cwd, updates, opts) {
    const existing = fetchThreadState(threadKey, cwd, opts);
    if (!existing) {
        return null;
    }
    const next = updateThreadState(existing, {
        bundle_restore_status: updates.bundle_restore_status ?? existing.bundle_restore_status,
        last_bundle_restore_error: updates.last_bundle_restore_error ?? existing.last_bundle_restore_error,
    });
    writeThreadState(threadKey, next, cwd, opts);
    return next;
}
function markThreadBundleStored(threadKey, cwd, updates, opts) {
    const existing = fetchThreadState(threadKey, cwd, opts) || createThreadState(threadKey);
    const next = updateThreadState(existing, {
        session_bundle_backend: updates.session_bundle_backend ?? existing.session_bundle_backend,
        session_bundle_artifact_id: updates.session_bundle_artifact_id ?? existing.session_bundle_artifact_id,
        session_bundle_artifact_name: updates.session_bundle_artifact_name ?? existing.session_bundle_artifact_name,
        session_bundle_run_id: updates.session_bundle_run_id ?? existing.session_bundle_run_id,
    });
    writeThreadState(threadKey, next, cwd, opts);
    return next;
}
//# sourceMappingURL=thread-state.js.map