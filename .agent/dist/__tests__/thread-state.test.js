"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const thread_state_js_1 = require("../thread-state.js");
// ---------------------------------------------------------------------------
// Pure data operation tests
// ---------------------------------------------------------------------------
const TEST_KEY = "self-evolving/repo:issue:21:implement:default";
(0, node_test_1.test)("createThreadState produces a valid initial state", () => {
    const state = (0, thread_state_js_1.createThreadState)(TEST_KEY);
    node_assert_1.strict.equal(state.schema_version, thread_state_js_1.THREAD_STATE_SCHEMA_VERSION);
    node_assert_1.strict.equal(state.thread_key, TEST_KEY);
    node_assert_1.strict.equal(state.acpxRecordId, "");
    node_assert_1.strict.equal(state.acpxSessionId, "");
    node_assert_1.strict.equal(state.agentSessionId, "");
    node_assert_1.strict.equal(state.branch, "");
    node_assert_1.strict.equal(state.status, "pending");
    node_assert_1.strict.equal(state.resume_status, "not_attempted");
    node_assert_1.strict.equal(state.last_resume_error, "");
    node_assert_1.strict.equal(state.resumed_from_session_id, "");
    node_assert_1.strict.equal(state.session_bundle_backend, "");
    node_assert_1.strict.equal(state.session_bundle_artifact_id, "");
    node_assert_1.strict.equal(state.session_bundle_artifact_name, "");
    node_assert_1.strict.equal(state.session_bundle_run_id, "");
    node_assert_1.strict.equal(state.bundle_restore_status, "not_attempted");
    node_assert_1.strict.equal(state.last_bundle_restore_error, "");
    node_assert_1.strict.equal(state.forked_from_thread_key, "");
    node_assert_1.strict.equal(state.forked_from_acpx_session_id, "");
    node_assert_1.strict.equal(state.last_run_url, "");
    node_assert_1.strict.equal(state.last_comment_url, "");
    node_assert_1.strict.equal(state.attempt_count, 0);
    node_assert_1.strict.ok(state.created_at);
    node_assert_1.strict.ok(state.updated_at);
});
(0, node_test_1.test)("updateThreadState merges updates and bumps updated_at", () => {
    const state = (0, thread_state_js_1.createThreadState)(TEST_KEY);
    const originalCreated = state.created_at;
    const updated = (0, thread_state_js_1.updateThreadState)(state, {
        status: "running",
        acpxRecordId: "rec-789",
        attempt_count: 1,
    });
    node_assert_1.strict.equal(updated.thread_key, TEST_KEY);
    node_assert_1.strict.equal(updated.status, "running");
    node_assert_1.strict.equal(updated.acpxRecordId, "rec-789");
    node_assert_1.strict.equal(updated.attempt_count, 1);
    node_assert_1.strict.equal(updated.created_at, originalCreated);
    node_assert_1.strict.ok(updated.updated_at >= originalCreated);
});
(0, node_test_1.test)("updateThreadState preserves thread_key even if updates try to change it", () => {
    const state = (0, thread_state_js_1.createThreadState)(TEST_KEY);
    const updated = (0, thread_state_js_1.updateThreadState)(state, { thread_key: "tampered" });
    node_assert_1.strict.equal(updated.thread_key, TEST_KEY);
});
(0, node_test_1.test)("updateThreadState preserves created_at even if updates try to change it", () => {
    const state = (0, thread_state_js_1.createThreadState)(TEST_KEY);
    const original = state.created_at;
    const updated = (0, thread_state_js_1.updateThreadState)(state, { created_at: "2020-01-01T00:00:00Z" });
    node_assert_1.strict.equal(updated.created_at, original);
});
(0, node_test_1.test)("normalizeThreadState upgrades legacy resume_failed state", () => {
    const legacy = (0, thread_state_js_1.normalizeThreadState)({
        thread_key: TEST_KEY,
        status: "resume_failed",
        acpxSessionId: "ses-old",
        attempt_count: 2,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T01:00:00Z",
    });
    node_assert_1.strict.ok(legacy);
    node_assert_1.strict.equal(legacy.schema_version, thread_state_js_1.THREAD_STATE_SCHEMA_VERSION);
    node_assert_1.strict.equal(legacy.status, "failed");
    node_assert_1.strict.equal(legacy.resume_status, "failed");
    node_assert_1.strict.equal(legacy.acpxSessionId, "ses-old");
    node_assert_1.strict.equal(legacy.bundle_restore_status, "not_attempted");
    node_assert_1.strict.equal(legacy.forked_from_thread_key, "");
    node_assert_1.strict.equal(legacy.forked_from_acpx_session_id, "");
    node_assert_1.strict.equal(legacy.attempt_count, 2);
});
// ---------------------------------------------------------------------------
// Ref naming tests
// ---------------------------------------------------------------------------
(0, node_test_1.test)("threadKeyToRefName converts slashes and colons", () => {
    node_assert_1.strict.equal((0, thread_state_js_1.threadKeyToRefName)("self-evolving/repo:issue:42:implement:default"), "self-evolving%2Frepo--issue--42--implement--default");
});
(0, node_test_1.test)("threadKeyToRefName handles special characters", () => {
    node_assert_1.strict.equal((0, thread_state_js_1.threadKeyToRefName)("org/repo:pull_request:7:fix-pr:claude"), "org%2Frepo--pull_request--7--fix-pr--claude");
});
(0, node_test_1.test)("threadKeyToRefName is injective: distinct keys with similar slugs don't collide", () => {
    const a = (0, thread_state_js_1.threadKeyToRefName)("foo/bar-baz:issue:1:implement:default");
    const b = (0, thread_state_js_1.threadKeyToRefName)("foo-bar/baz:issue:1:implement:default");
    node_assert_1.strict.notEqual(a, b, "different repo slugs must produce different ref names");
});
(0, node_test_1.test)("threadKeyToRefName round-trips percent in key", () => {
    const a = (0, thread_state_js_1.threadKeyToRefName)("org/%2F:issue:1:r:l");
    const b = (0, thread_state_js_1.threadKeyToRefName)("org//::issue:1:r:l");
    node_assert_1.strict.notEqual(a, b);
});
(0, node_test_1.test)("refPathForThreadKey produces full ref path", () => {
    node_assert_1.strict.equal((0, thread_state_js_1.refPathForThreadKey)("self-evolving/repo:issue:42:implement:default"), "refs/agent-state/self-evolving%2Frepo--issue--42--implement--default");
});
// ---------------------------------------------------------------------------
// Git integration test helpers
// ---------------------------------------------------------------------------
let remoteDir;
let workDir;
function gitIn(dir, args) {
    return (0, node_child_process_1.execFileSync)("git", args, {
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
    }).toString("utf8").trim();
}
function setupRepos() {
    const base = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-ts-test-"));
    remoteDir = (0, node_path_1.join)(base, "remote.git");
    workDir = (0, node_path_1.join)(base, "work");
    (0, node_child_process_1.execFileSync)("git", ["init", "--bare", remoteDir], { stdio: "pipe" });
    (0, node_child_process_1.execFileSync)("git", ["clone", remoteDir, workDir], { stdio: "pipe" });
    // git commit-tree needs author/committer identity
    gitIn(workDir, ["config", "user.name", "test"]);
    gitIn(workDir, ["config", "user.email", "test@test.com"]);
}
function teardownRepos() {
    try {
        (0, node_fs_1.rmSync)((0, node_path_1.join)(remoteDir, ".."), { recursive: true, force: true });
    }
    catch { /* ok */ }
}
// ---------------------------------------------------------------------------
// Git integration tests
// ---------------------------------------------------------------------------
const GIT_TEST_KEY = "self-evolving/repo:issue:42:implement:default";
(0, node_test_1.test)("fetchThreadState returns null for nonexistent ref", () => {
    setupRepos();
    try {
        const result = (0, thread_state_js_1.fetchThreadState)("nonexistent:key:1:route:lane", workDir);
        node_assert_1.strict.equal(result, null);
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("writeThreadState + fetchThreadState round-trip", () => {
    setupRepos();
    try {
        const state = (0, thread_state_js_1.updateThreadState)((0, thread_state_js_1.createThreadState)(GIT_TEST_KEY), {
            status: "running",
            attempt_count: 1,
            acpxRecordId: "rec-abc",
            acpxSessionId: "ses-def",
        });
        (0, thread_state_js_1.writeThreadState)(GIT_TEST_KEY, state, workDir);
        const fetched = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.ok(fetched);
        node_assert_1.strict.equal(fetched.thread_key, GIT_TEST_KEY);
        node_assert_1.strict.equal(fetched.status, "running");
        node_assert_1.strict.equal(fetched.attempt_count, 1);
        node_assert_1.strict.equal(fetched.acpxRecordId, "rec-abc");
        node_assert_1.strict.equal(fetched.acpxSessionId, "ses-def");
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("writeThreadState creates commit history (parent chain)", () => {
    setupRepos();
    try {
        const state1 = (0, thread_state_js_1.updateThreadState)((0, thread_state_js_1.createThreadState)(GIT_TEST_KEY), {
            status: "running",
            attempt_count: 1,
        });
        (0, thread_state_js_1.writeThreadState)(GIT_TEST_KEY, state1, workDir);
        const state2 = (0, thread_state_js_1.updateThreadState)(state1, {
            status: "completed",
            attempt_count: 2,
        });
        (0, thread_state_js_1.writeThreadState)(GIT_TEST_KEY, state2, workDir);
        const ref = (0, thread_state_js_1.refPathForThreadKey)(GIT_TEST_KEY);
        const log = gitIn(workDir, ["log", "--oneline", ref]);
        const lines = log.split("\n").filter(Boolean);
        node_assert_1.strict.equal(lines.length, 2);
        node_assert_1.strict.match(lines[0], /completed.*attempt 2/);
        node_assert_1.strict.match(lines[1], /running.*attempt 1/);
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("refs don't appear in normal branch listing", () => {
    setupRepos();
    try {
        const state = (0, thread_state_js_1.updateThreadState)((0, thread_state_js_1.createThreadState)(GIT_TEST_KEY), {
            status: "running",
            attempt_count: 1,
        });
        (0, thread_state_js_1.writeThreadState)(GIT_TEST_KEY, state, workDir);
        const branches = gitIn(workDir, ["branch", "-a"]);
        node_assert_1.strict.ok(!branches.includes("agent-state"));
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("multiple thread keys produce independent refs", () => {
    setupRepos();
    try {
        const key1 = "org/repo:issue:1:implement:default";
        const key2 = "org/repo:issue:2:review:default";
        const state1 = (0, thread_state_js_1.updateThreadState)((0, thread_state_js_1.createThreadState)(key1), {
            status: "running",
            attempt_count: 1,
        });
        const state2 = (0, thread_state_js_1.updateThreadState)((0, thread_state_js_1.createThreadState)(key2), {
            status: "completed",
            attempt_count: 3,
        });
        (0, thread_state_js_1.writeThreadState)(key1, state1, workDir);
        (0, thread_state_js_1.writeThreadState)(key2, state2, workDir);
        const fetched1 = (0, thread_state_js_1.fetchThreadState)(key1, workDir);
        const fetched2 = (0, thread_state_js_1.fetchThreadState)(key2, workDir);
        node_assert_1.strict.ok(fetched1);
        node_assert_1.strict.ok(fetched2);
        node_assert_1.strict.equal(fetched1.status, "running");
        node_assert_1.strict.equal(fetched1.attempt_count, 1);
        node_assert_1.strict.equal(fetched2.status, "completed");
        node_assert_1.strict.equal(fetched2.attempt_count, 3);
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("markThreadRunning creates fresh state when none exists", () => {
    setupRepos();
    try {
        const state = (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, {
            last_run_url: "https://github.com/org/repo/actions/runs/123",
        });
        node_assert_1.strict.equal(state.status, "running");
        node_assert_1.strict.equal(state.attempt_count, 1);
        node_assert_1.strict.equal(state.last_run_url, "https://github.com/org/repo/actions/runs/123");
        node_assert_1.strict.equal(state.forked_from_thread_key, "");
        node_assert_1.strict.equal(state.forked_from_acpx_session_id, "");
        const fetched = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.ok(fetched);
        node_assert_1.strict.equal(fetched.status, "running");
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("markThreadRunning bumps attempt_count on existing state", () => {
    setupRepos();
    try {
        (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, {
            last_run_url: "run-1",
            forked_from_thread_key: "repo:issue:1:answer:default",
            forked_from_acpx_session_id: "ses-source",
            bundle_restore_status: "restored_from_fork",
            last_bundle_restore_error: "",
        });
        const state = (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, { last_run_url: "run-2" });
        node_assert_1.strict.equal(state.status, "running");
        node_assert_1.strict.equal(state.attempt_count, 2);
        node_assert_1.strict.equal(state.last_run_url, "run-2");
        node_assert_1.strict.equal(state.forked_from_thread_key, "repo:issue:1:answer:default");
        node_assert_1.strict.equal(state.forked_from_acpx_session_id, "ses-source");
        node_assert_1.strict.equal(state.bundle_restore_status, "restored_from_fork");
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("markThreadCompleted sets status and identity", () => {
    setupRepos();
    try {
        const running = (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, {});
        const completed = (0, thread_state_js_1.markThreadCompleted)(GIT_TEST_KEY, running, workDir, {
            acpxRecordId: "rec-final",
            acpxSessionId: "ses-final",
        });
        node_assert_1.strict.equal(completed.status, "completed");
        node_assert_1.strict.equal(completed.acpxRecordId, "rec-final");
        node_assert_1.strict.equal(completed.acpxSessionId, "ses-final");
        const fetched = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.ok(fetched);
        node_assert_1.strict.equal(fetched.status, "completed");
        node_assert_1.strict.equal(fetched.acpxRecordId, "rec-final");
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("markThreadCompleted always produces completed state", () => {
    setupRepos();
    try {
        const running = (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, {});
        const completed = (0, thread_state_js_1.markThreadCompleted)(GIT_TEST_KEY, running, workDir, {
            acpxRecordId: "rec-x",
        });
        node_assert_1.strict.equal(completed.status, "completed");
        node_assert_1.strict.equal(completed.acpxRecordId, "rec-x");
        const fetched = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.ok(fetched);
        node_assert_1.strict.equal(fetched.status, "completed");
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("markThreadFailed records failed run status", () => {
    setupRepos();
    try {
        const running = (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, {});
        const failed = (0, thread_state_js_1.markThreadFailed)(GIT_TEST_KEY, running, workDir, {
            resume_status: "not_attempted",
        });
        node_assert_1.strict.equal(failed.status, "failed");
        node_assert_1.strict.equal(failed.resume_status, "not_attempted");
        const fetched = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.ok(fetched);
        node_assert_1.strict.equal(fetched.status, "failed");
        node_assert_1.strict.equal(fetched.resume_status, "not_attempted");
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("markThreadFailed records resume failure separately from run failure", () => {
    setupRepos();
    try {
        const running = (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, {});
        const failed = (0, thread_state_js_1.markThreadFailed)(GIT_TEST_KEY, running, workDir, {
            resume_status: "failed",
            last_resume_error: "resume expired",
            resumed_from_session_id: "ses-old",
        });
        node_assert_1.strict.equal(failed.status, "failed");
        node_assert_1.strict.equal(failed.resume_status, "failed");
        node_assert_1.strict.equal(failed.last_resume_error, "resume expired");
        node_assert_1.strict.equal(failed.resumed_from_session_id, "ses-old");
        const fetched = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.ok(fetched);
        node_assert_1.strict.equal(fetched.status, "failed");
        node_assert_1.strict.equal(fetched.resume_status, "failed");
        node_assert_1.strict.equal(fetched.resumed_from_session_id, "ses-old");
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("markThreadBundleRestore records restore outcomes independently", () => {
    setupRepos();
    try {
        (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, {});
        const updated = (0, thread_state_js_1.markThreadBundleRestore)(GIT_TEST_KEY, workDir, { bundle_restore_status: "failed", last_bundle_restore_error: "artifact expired" });
        node_assert_1.strict.ok(updated);
        node_assert_1.strict.equal(updated.bundle_restore_status, "failed");
        node_assert_1.strict.equal(updated.last_bundle_restore_error, "artifact expired");
        const fetched = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.ok(fetched);
        node_assert_1.strict.equal(fetched.bundle_restore_status, "failed");
        node_assert_1.strict.equal(fetched.last_bundle_restore_error, "artifact expired");
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("markThreadBundleRestore does not create fresh state on a missing thread", () => {
    setupRepos();
    try {
        const updated = (0, thread_state_js_1.markThreadBundleRestore)(GIT_TEST_KEY, workDir, { bundle_restore_status: "not_available", last_bundle_restore_error: "" });
        node_assert_1.strict.equal(updated, null);
        const fetched = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.equal(fetched, null);
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("markThreadBundleStored records artifact pointer metadata", () => {
    setupRepos();
    try {
        const updated = (0, thread_state_js_1.markThreadBundleStored)(GIT_TEST_KEY, workDir, {
            session_bundle_backend: "github-artifact",
            session_bundle_artifact_id: "123",
            session_bundle_artifact_name: "session-bundle-pr-42",
            session_bundle_run_id: "456",
        });
        node_assert_1.strict.equal(updated.session_bundle_backend, "github-artifact");
        node_assert_1.strict.equal(updated.session_bundle_artifact_id, "123");
        node_assert_1.strict.equal(updated.session_bundle_artifact_name, "session-bundle-pr-42");
        node_assert_1.strict.equal(updated.session_bundle_run_id, "456");
        const fetched = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.ok(fetched);
        node_assert_1.strict.equal(fetched.session_bundle_artifact_id, "123");
        node_assert_1.strict.equal(fetched.session_bundle_run_id, "456");
    }
    finally {
        teardownRepos();
    }
});
(0, node_test_1.test)("full lifecycle: create → running → completed with identity", () => {
    setupRepos();
    try {
        // 1. First run starts
        const running = (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, {
            last_run_url: "https://github.com/org/repo/actions/runs/100",
            branch: "agent/codex-42",
        });
        node_assert_1.strict.equal(running.status, "running");
        node_assert_1.strict.equal(running.attempt_count, 1);
        // 2. Run completes with session identity
        const completed = (0, thread_state_js_1.markThreadCompleted)(GIT_TEST_KEY, running, workDir, {
            acpxRecordId: "rec-abc",
            acpxSessionId: "ses-def",
        });
        node_assert_1.strict.equal(completed.status, "completed");
        node_assert_1.strict.equal(completed.acpxRecordId, "rec-abc");
        // 3. Second run starts — reads prior state for resume
        const prior = (0, thread_state_js_1.fetchThreadState)(GIT_TEST_KEY, workDir);
        node_assert_1.strict.ok(prior);
        node_assert_1.strict.equal(prior.acpxSessionId, "ses-def"); // available for resume
        const running2 = (0, thread_state_js_1.markThreadRunning)(GIT_TEST_KEY, workDir, {
            last_run_url: "https://github.com/org/repo/actions/runs/200",
        });
        node_assert_1.strict.equal(running2.attempt_count, 2);
        node_assert_1.strict.equal(running2.acpxSessionId, "ses-def"); // preserved from prior
        // 4. Verify audit trail
        const ref = (0, thread_state_js_1.refPathForThreadKey)(GIT_TEST_KEY);
        const log = gitIn(workDir, ["log", "--oneline", ref]);
        const lines = log.split("\n").filter(Boolean);
        node_assert_1.strict.equal(lines.length, 3); // running(1) → completed → running(2)
    }
    finally {
        teardownRepos();
    }
});
//# sourceMappingURL=thread-state.test.js.map