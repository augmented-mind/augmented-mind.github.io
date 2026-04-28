"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const scheduled_activity_js_1 = require("../scheduled-activity.js");
function runGit(args, cwd) {
    const result = (0, node_child_process_1.spawnSync)("git", args, { cwd, encoding: "utf8" });
    node_assert_1.strict.equal(result.status, 0, result.stderr);
}
function runShellGate(env) {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "scheduled-gate-test-"));
    const outputFile = (0, node_path_1.join)(tempDir, "outputs.txt");
    const result = (0, node_child_process_1.spawnSync)("bash", ["scripts/resolve-scheduled-activity-gate.sh"], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            GITHUB_OUTPUT: outputFile,
            GITHUB_REPOSITORY: "",
            GH_TOKEN: "",
            INPUT_GITHUB_TOKEN: "",
            REPO_SLUG: "",
            RUNNER_TEMP: tempDir,
            ...env,
        },
        encoding: "utf8",
    });
    const outputText = result.status === 0 ? (0, node_fs_1.readFileSync)(outputFile, "utf8") : "";
    const payload = result.stdout.trim() ? JSON.parse(result.stdout) : null;
    return { result, outputText, payload };
}
function createCursorWorkspace(dependencyValue, selfValue) {
    const source = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "scheduled-gate-source-"));
    const bare = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "scheduled-gate-origin-"));
    const workspace = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "scheduled-gate-workspace-"));
    runGit(["init", "--bare"], bare);
    runGit(["init"], source);
    runGit(["config", "user.email", "sepo-agent@example.invalid"], source);
    runGit(["config", "user.name", "sepo-agent"], source);
    runGit(["remote", "add", "origin", bare], source);
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(source, "state.json"), `${JSON.stringify({ last_activity_at: dependencyValue })}\n`);
    runGit(["add", "state.json"], source);
    runGit(["commit", "-m", "sync state"], source);
    runGit(["push", "origin", "HEAD:refs/agent-memory-state/sync"], source);
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(source, "state.json"), `${JSON.stringify({ last_scan_at: selfValue })}\n`);
    runGit(["add", "state.json"], source);
    runGit(["commit", "-m", "scan state"], source);
    runGit(["push", "origin", "HEAD:refs/agent-memory-state/scan"], source);
    runGit(["init"], workspace);
    runGit(["remote", "add", "origin", bare], workspace);
    return workspace;
}
(0, node_test_1.test)("resolveScheduledActivityGate bypasses policy for manual runs", () => {
    const result = (0, scheduled_activity_js_1.resolveScheduledActivityGate)({
        eventName: "workflow_dispatch",
        schedulePolicy: '{"default_mode":"disabled"}',
        workflow: "agent-memory-scan.yml",
    });
    node_assert_1.strict.equal(result.skip, false);
    node_assert_1.strict.equal(result.mode, "disabled");
    node_assert_1.strict.equal(result.reason, "non-scheduled run");
});
(0, node_test_1.test)("resolveScheduledActivityGate applies disabled and always_run modes", () => {
    const disabled = (0, scheduled_activity_js_1.resolveScheduledActivityGate)({
        eventName: "schedule",
        schedulePolicy: '{"default_mode":"disabled"}',
        workflow: "agent-memory-scan.yml",
    });
    node_assert_1.strict.equal(disabled.skip, true);
    const alwaysRun = (0, scheduled_activity_js_1.resolveScheduledActivityGate)({
        eventName: "schedule",
        schedulePolicy: '{"default_mode":"skip_no_updates","workflow_overrides":{"agent-memory-sync.yml":"always_run"}}',
        workflow: "agent-memory-sync.yml",
    });
    node_assert_1.strict.equal(alwaysRun.skip, false);
    node_assert_1.strict.equal(alwaysRun.mode, "always_run");
});
(0, node_test_1.test)("resolveScheduledActivityGate uses activity count when provided", () => {
    const skipped = (0, scheduled_activity_js_1.resolveScheduledActivityGate)({
        eventName: "schedule",
        schedulePolicy: "",
        workflow: "agent-daily-summary.yml",
        activityCount: "0",
    });
    node_assert_1.strict.equal(skipped.skip, true);
    node_assert_1.strict.equal(skipped.reason, "activity count is zero");
    const run = (0, scheduled_activity_js_1.resolveScheduledActivityGate)({
        eventName: "schedule",
        schedulePolicy: "",
        workflow: "agent-daily-summary.yml",
        activityCount: "3",
    });
    node_assert_1.strict.equal(run.skip, false);
    node_assert_1.strict.equal(run.reason, "activity count is nonzero");
});
(0, node_test_1.test)("resolveScheduledActivityGate runs when skip_no_updates lacks detector config", () => {
    const result = (0, scheduled_activity_js_1.resolveScheduledActivityGate)({
        eventName: "schedule",
        schedulePolicy: '{"default_mode":"skip_no_updates"}',
        workflow: "agent-memory-sync.yml",
    });
    node_assert_1.strict.equal(result.skip, false);
    node_assert_1.strict.equal(result.reason, "missing activity cursor configuration");
});
(0, node_test_1.test)("scheduled-activity-gate shell script resolves disabled before runtime build", () => {
    const { result, outputText } = runShellGate({
        GITHUB_EVENT_NAME: "schedule",
        AGENT_SCHEDULE_POLICY: '{"default_mode":"disabled"}',
        WORKFLOW_FILENAME: "agent-memory-scan.yml",
    });
    node_assert_1.strict.equal(result.status, 0, result.stderr);
    node_assert_1.strict.match(result.stdout, /"skip": true/);
    node_assert_1.strict.match(outputText, /skip<<[\s\S]*true/);
});
(0, node_test_1.test)("scheduled-activity-gate shell script matches core gate modes", () => {
    for (const [name, env, expected] of [
        [
            "always_run override",
            {
                GITHUB_EVENT_NAME: "schedule",
                AGENT_SCHEDULE_POLICY: '{"default_mode":"skip_no_updates","workflow_overrides":{"agent-memory-sync.yml":"always_run"}}',
                WORKFLOW_FILENAME: "agent-memory-sync.yml",
            },
            { skip: false, mode: "always_run", reason: "schedule policy always_run" },
        ],
        [
            "activity count skip",
            {
                GITHUB_EVENT_NAME: "schedule",
                AGENT_SCHEDULE_POLICY: "",
                WORKFLOW_FILENAME: "agent-daily-summary.yml",
                ACTIVITY_COUNT: "0",
            },
            { skip: true, mode: "skip_no_updates", reason: "activity count is zero" },
        ],
        [
            "activity count run",
            {
                GITHUB_EVENT_NAME: "schedule",
                AGENT_SCHEDULE_POLICY: "",
                WORKFLOW_FILENAME: "agent-daily-summary.yml",
                ACTIVITY_COUNT: "3",
            },
            { skip: false, mode: "skip_no_updates", reason: "activity count is nonzero" },
        ],
    ]) {
        const { result, payload } = runShellGate(env);
        node_assert_1.strict.equal(result.status, 0, `${name}: ${result.stderr}`);
        node_assert_1.strict.deepEqual({ skip: payload.skip, mode: payload.mode, reason: payload.reason }, expected, name);
    }
});
(0, node_test_1.test)("scheduled-activity-gate shell script rejects invalid policy", () => {
    const { result } = runShellGate({
        GITHUB_EVENT_NAME: "schedule",
        AGENT_SCHEDULE_POLICY: '{"default_mode":"banana"}',
        WORKFLOW_FILENAME: "agent-memory-scan.yml",
    });
    node_assert_1.strict.equal(result.status, 2);
    node_assert_1.strict.match(result.stderr, /default_mode must be one of/);
});
(0, node_test_1.test)("scheduled-activity-gate shell script compares cursor refs", () => {
    const skippedWorkspace = createCursorWorkspace("2026-04-27T10:00:00Z", "2026-04-27T10:00:00.123Z");
    const skipped = runShellGate({
        GITHUB_EVENT_NAME: "schedule",
        AGENT_SCHEDULE_POLICY: "",
        WORKFLOW_FILENAME: "agent-memory-scan.yml",
        DEPENDENCY_REF: "refs/agent-memory-state/sync",
        DEPENDENCY_FIELD: "last_activity_at",
        SELF_REF: "refs/agent-memory-state/scan",
        SELF_FIELD: "last_scan_at",
        GITHUB_WORKSPACE: skippedWorkspace,
    });
    node_assert_1.strict.equal(skipped.result.status, 0, skipped.result.stderr);
    node_assert_1.strict.equal(skipped.payload.skip, true);
    node_assert_1.strict.equal(skipped.payload.reason, "dependency cursor has not advanced");
    const runWorkspace = createCursorWorkspace("2026-04-27T11:00:00Z", "2026-04-27T10:00:00Z");
    const run = runShellGate({
        GITHUB_EVENT_NAME: "schedule",
        AGENT_SCHEDULE_POLICY: "",
        WORKFLOW_FILENAME: "agent-memory-scan.yml",
        DEPENDENCY_REF: "refs/agent-memory-state/sync",
        DEPENDENCY_FIELD: "last_activity_at",
        SELF_REF: "refs/agent-memory-state/scan",
        SELF_FIELD: "last_scan_at",
        GITHUB_WORKSPACE: runWorkspace,
    });
    node_assert_1.strict.equal(run.result.status, 0, run.result.stderr);
    node_assert_1.strict.equal(run.payload.skip, false);
    node_assert_1.strict.equal(run.payload.reason, "dependency cursor advanced");
});
(0, node_test_1.test)("resolveCursorActivity skips only when dependency cursor has not advanced", () => {
    const skipped = (0, scheduled_activity_js_1.resolveCursorActivity)("skip_no_updates", "2026-04-27T10:00:00Z", "2026-04-27T10:00:00Z");
    node_assert_1.strict.equal(skipped.skip, true);
    node_assert_1.strict.equal(skipped.reason, "dependency cursor has not advanced");
    const run = (0, scheduled_activity_js_1.resolveCursorActivity)("skip_no_updates", "2026-04-27T11:00:00Z", "2026-04-27T10:00:00Z");
    node_assert_1.strict.equal(run.skip, false);
    node_assert_1.strict.equal(run.reason, "dependency cursor advanced");
    const missing = (0, scheduled_activity_js_1.resolveCursorActivity)("skip_no_updates", "", "2026-04-27T10:00:00Z");
    node_assert_1.strict.equal(missing.skip, false);
    node_assert_1.strict.equal(missing.reason, "missing or invalid activity cursor");
});
//# sourceMappingURL=scheduled-activity.test.js.map