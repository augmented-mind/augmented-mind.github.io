"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const memory_sync_state_js_1 = require("../memory-sync-state.js");
(0, node_test_1.test)("MEMORY_SYNC_STATE_REF points to a dedicated ref namespace", () => {
    node_assert_1.strict.equal(memory_sync_state_js_1.MEMORY_SYNC_STATE_REF, "refs/agent-memory-state/sync");
});
(0, node_test_1.test)("createMemorySyncState produces an empty cursor set", () => {
    const state = (0, memory_sync_state_js_1.createMemorySyncState)("owner/repo");
    node_assert_1.strict.equal(state.repo_slug, "owner/repo");
    node_assert_1.strict.equal(state.last_sync_at, "");
    node_assert_1.strict.equal(state.last_activity_at, "");
    node_assert_1.strict.deepEqual(state.cursors, { issues: "", pulls: "", discussions: "", commits: "" });
    node_assert_1.strict.equal(state.schema_version, memory_sync_state_js_1.MEMORY_SYNC_STATE_SCHEMA_VERSION);
});
(0, node_test_1.test)("updateMemorySyncState merges cursors partially and refreshes updated_at", () => {
    const initial = (0, memory_sync_state_js_1.createMemorySyncState)("owner/repo");
    const next = (0, memory_sync_state_js_1.updateMemorySyncState)(initial, {
        last_sync_at: "2026-04-23T00:00:00Z",
        last_activity_at: "2026-04-22T12:00:00Z",
        cursors: { issues: "2026-04-22T00:00:00Z" },
        last_run_url: "https://example.com/run/1",
    });
    node_assert_1.strict.equal(next.last_sync_at, "2026-04-23T00:00:00Z");
    node_assert_1.strict.equal(next.last_activity_at, "2026-04-22T12:00:00Z");
    node_assert_1.strict.equal(next.cursors.issues, "2026-04-22T00:00:00Z");
    node_assert_1.strict.equal(next.cursors.pulls, "");
    node_assert_1.strict.equal(next.last_run_url, "https://example.com/run/1");
    node_assert_1.strict.ok(next.updated_at >= initial.updated_at);
    node_assert_1.strict.equal(next.created_at, initial.created_at);
});
(0, node_test_1.test)("normalizeMemorySyncState rejects records without a repo slug", () => {
    node_assert_1.strict.equal((0, memory_sync_state_js_1.normalizeMemorySyncState)(null), null);
    node_assert_1.strict.equal((0, memory_sync_state_js_1.normalizeMemorySyncState)({}), null);
    node_assert_1.strict.equal((0, memory_sync_state_js_1.normalizeMemorySyncState)({ repo_slug: "" }), null);
});
(0, node_test_1.test)("normalizeMemorySyncState fills in missing cursor fields", () => {
    const state = (0, memory_sync_state_js_1.normalizeMemorySyncState)({
        repo_slug: "owner/repo",
        cursors: { issues: "x" },
    });
    node_assert_1.strict.ok(state);
    node_assert_1.strict.equal(state.repo_slug, "owner/repo");
    node_assert_1.strict.equal(state.last_activity_at, "");
    node_assert_1.strict.equal(state.cursors.issues, "x");
    node_assert_1.strict.equal(state.cursors.pulls, "");
});
//# sourceMappingURL=memory-sync-state.test.js.map