"use strict";
// Ref-backed sync cursors for the memory branch.
//
// Stored at refs/agent-memory-state/sync as a one-file tree. Separate from the
// agent/memory branch so cursor updates don't pollute the memory content
// history and don't race with memory commits.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMORY_SYNC_STATE_REF = exports.MEMORY_SYNC_STATE_SCHEMA_VERSION = void 0;
exports.createMemorySyncState = createMemorySyncState;
exports.updateMemorySyncState = updateMemorySyncState;
exports.normalizeMemorySyncState = normalizeMemorySyncState;
exports.fetchMemorySyncState = fetchMemorySyncState;
exports.writeMemorySyncState = writeMemorySyncState;
const git_js_1 = require("./git.js");
exports.MEMORY_SYNC_STATE_SCHEMA_VERSION = 1;
exports.MEMORY_SYNC_STATE_REF = "refs/agent-memory-state/sync";
const STATE_FILENAME = "state.json";
const REF_NOT_FOUND_PATTERN = /couldn't find remote ref|no matching remote head/i;
function toStringOrEmpty(value) {
    return typeof value === "string" ? value : "";
}
function toIsoOrNow(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
}
function normalizeCursors(raw) {
    const record = raw && typeof raw === "object" ? raw : {};
    return {
        issues: toStringOrEmpty(record.issues),
        pulls: toStringOrEmpty(record.pulls),
        discussions: toStringOrEmpty(record.discussions),
        commits: toStringOrEmpty(record.commits),
    };
}
function resolveRemoteTarget(remote, opts) {
    if (opts?.token && opts?.repo)
        return (0, git_js_1.buildAuthUrl)(opts.token, opts.repo);
    return remote;
}
function createMemorySyncState(repoSlug) {
    const now = new Date().toISOString();
    return {
        schema_version: exports.MEMORY_SYNC_STATE_SCHEMA_VERSION,
        repo_slug: repoSlug,
        last_sync_at: "",
        last_activity_at: "",
        cursors: { issues: "", pulls: "", discussions: "", commits: "" },
        last_run_url: "",
        created_at: now,
        updated_at: now,
    };
}
function updateMemorySyncState(state, updates) {
    return {
        ...state,
        last_sync_at: updates.last_sync_at ?? state.last_sync_at,
        last_activity_at: updates.last_activity_at ?? state.last_activity_at,
        cursors: { ...state.cursors, ...(updates.cursors || {}) },
        last_run_url: updates.last_run_url ?? state.last_run_url,
        schema_version: state.schema_version,
        repo_slug: state.repo_slug,
        created_at: state.created_at,
        updated_at: new Date().toISOString(),
    };
}
function normalizeMemorySyncState(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const record = raw;
    const repoSlug = toStringOrEmpty(record.repo_slug);
    if (!repoSlug)
        return null;
    const now = new Date().toISOString();
    return {
        schema_version: exports.MEMORY_SYNC_STATE_SCHEMA_VERSION,
        repo_slug: repoSlug,
        last_sync_at: toStringOrEmpty(record.last_sync_at),
        last_activity_at: toStringOrEmpty(record.last_activity_at),
        cursors: normalizeCursors(record.cursors),
        last_run_url: toStringOrEmpty(record.last_run_url),
        created_at: toIsoOrNow(record.created_at, now),
        updated_at: toIsoOrNow(record.updated_at, now),
    };
}
function fetchMemorySyncState(cwd, opts) {
    const origin = opts?.remote ?? "origin";
    const fetchTarget = resolveRemoteTarget(origin, opts);
    try {
        (0, git_js_1.git)(["fetch", "--no-tags", fetchTarget, `+${exports.MEMORY_SYNC_STATE_REF}:${exports.MEMORY_SYNC_STATE_REF}`], cwd);
    }
    catch (err) {
        const stderr = err?.stderr?.toString("utf8") ?? String(err);
        if (REF_NOT_FOUND_PATTERN.test(stderr))
            return null;
        throw err;
    }
    try {
        const json = (0, git_js_1.git)(["cat-file", "blob", `${exports.MEMORY_SYNC_STATE_REF}:${STATE_FILENAME}`], cwd);
        return normalizeMemorySyncState(JSON.parse(json));
    }
    catch {
        return null;
    }
}
function writeMemorySyncState(state, cwd, opts) {
    const origin = opts?.remote ?? "origin";
    const json = JSON.stringify(state, null, 2) + "\n";
    const blobSha = (0, git_js_1.git)(["hash-object", "-w", "--stdin"], cwd, json);
    const treeInput = `100644 blob ${blobSha}\t${STATE_FILENAME}\n`;
    const treeSha = (0, git_js_1.git)(["mktree"], cwd, treeInput);
    let parentArg;
    let expectedOid = null;
    try {
        const parentSha = (0, git_js_1.git)(["rev-parse", "--verify", exports.MEMORY_SYNC_STATE_REF], cwd);
        parentArg = ["-p", parentSha];
        expectedOid = parentSha;
    }
    catch {
        parentArg = [];
    }
    const commitSha = (0, git_js_1.git)([
        "commit-tree",
        treeSha,
        ...parentArg,
        "-m",
        `memory-sync-state: ${state.last_sync_at || "unsynced"}`,
    ], cwd);
    (0, git_js_1.git)(["update-ref", exports.MEMORY_SYNC_STATE_REF, commitSha], cwd);
    const pushTarget = resolveRemoteTarget(origin, opts);
    const leaseArg = expectedOid
        ? `--force-with-lease=${exports.MEMORY_SYNC_STATE_REF}:${expectedOid}`
        : "--force";
    (0, git_js_1.git)(["push", leaseArg, pushTarget, `${exports.MEMORY_SYNC_STATE_REF}:${exports.MEMORY_SYNC_STATE_REF}`], cwd);
}
//# sourceMappingURL=memory-sync-state.js.map