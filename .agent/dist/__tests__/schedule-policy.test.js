"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const schedule_policy_js_1 = require("../schedule-policy.js");
(0, node_test_1.test)("parseSchedulePolicy falls back to skip_no_updates when unset", () => {
    const policy = (0, schedule_policy_js_1.parseSchedulePolicy)("");
    node_assert_1.strict.equal(policy.defaultMode, schedule_policy_js_1.DEFAULT_SCHEDULE_MODE);
    node_assert_1.strict.equal(schedule_policy_js_1.DEFAULT_SCHEDULE_MODE, "skip_no_updates");
    node_assert_1.strict.deepEqual(policy.workflowOverrides, schedule_policy_js_1.DEFAULT_SCHEDULE_WORKFLOW_OVERRIDES);
    node_assert_1.strict.equal(policy.workflowOverrides["agent-memory-sync.yml"], "always_run");
});
(0, node_test_1.test)("parseSchedulePolicy accepts workflow overrides", () => {
    const policy = (0, schedule_policy_js_1.parseSchedulePolicy)('{"default_mode":"skip_no_updates","workflow_overrides":{"agent-memory-sync.yml":"always_run","agent-daily-summary.yml":"disabled"}}');
    node_assert_1.strict.equal(policy.defaultMode, "skip_no_updates");
    node_assert_1.strict.equal(policy.workflowOverrides["agent-memory-sync.yml"], "always_run");
    node_assert_1.strict.equal(policy.workflowOverrides["agent-daily-summary.yml"], "disabled");
});
(0, node_test_1.test)("parseSchedulePolicy normalizes workflow keys", () => {
    const policy = (0, schedule_policy_js_1.parseSchedulePolicy)('{"workflow_overrides":{"AGENT-MEMORY-SCAN.YML":"disabled"}}');
    node_assert_1.strict.equal(policy.workflowOverrides["agent-memory-scan.yml"], "disabled");
});
(0, node_test_1.test)("parseSchedulePolicy rejects invalid modes and workflow keys", () => {
    node_assert_1.strict.throws(() => (0, schedule_policy_js_1.parseSchedulePolicy)('{"default_mode":"banana"}'), /default_mode must be one of/);
    node_assert_1.strict.throws(() => (0, schedule_policy_js_1.parseSchedulePolicy)('{"workflow_overrides":{"../bad.yml":"disabled"}}'), /Invalid workflow override key/);
    node_assert_1.strict.throws(() => (0, schedule_policy_js_1.parseSchedulePolicy)('{"workflow_overrides":["agent-memory-scan.yml"]}'), /workflow_overrides must be an object/);
});
(0, node_test_1.test)("getScheduleModeForWorkflow prefers workflow override over default", () => {
    const policy = (0, schedule_policy_js_1.parseSchedulePolicy)('{"default_mode":"skip_no_updates","workflow_overrides":{"agent-memory-sync.yml":"always_run"}}');
    node_assert_1.strict.equal((0, schedule_policy_js_1.getScheduleModeForWorkflow)(policy, "agent-memory-sync.yml"), "always_run");
    node_assert_1.strict.equal((0, schedule_policy_js_1.getScheduleModeForWorkflow)(policy, "agent-memory-scan.yml"), "skip_no_updates");
});
(0, node_test_1.test)("isScheduleMode gates string inputs", () => {
    node_assert_1.strict.equal((0, schedule_policy_js_1.isScheduleMode)("always_run"), true);
    node_assert_1.strict.equal((0, schedule_policy_js_1.isScheduleMode)("skip_no_updates"), true);
    node_assert_1.strict.equal((0, schedule_policy_js_1.isScheduleMode)("disabled"), true);
    node_assert_1.strict.equal((0, schedule_policy_js_1.isScheduleMode)("enabled"), false);
    node_assert_1.strict.equal((0, schedule_policy_js_1.isScheduleMode)(undefined), false);
});
//# sourceMappingURL=schedule-policy.test.js.map