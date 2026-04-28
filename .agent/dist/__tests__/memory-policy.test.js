"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const memory_policy_js_1 = require("../memory-policy.js");
(0, node_test_1.test)("parseMemoryPolicy falls back to default-enabled when unset", () => {
    const policy = (0, memory_policy_js_1.parseMemoryPolicy)("");
    node_assert_1.strict.equal(policy.defaultMode, memory_policy_js_1.DEFAULT_MEMORY_MODE);
    node_assert_1.strict.deepEqual(policy.routeOverrides, {});
    node_assert_1.strict.equal(memory_policy_js_1.DEFAULT_MEMORY_MODE, "enabled");
});
(0, node_test_1.test)("parseMemoryPolicy accepts default_mode alone", () => {
    const policy = (0, memory_policy_js_1.parseMemoryPolicy)('{"default_mode": "read-only"}');
    node_assert_1.strict.equal(policy.defaultMode, "read-only");
    node_assert_1.strict.deepEqual(policy.routeOverrides, {});
});
(0, node_test_1.test)("parseMemoryPolicy accepts route_overrides alone", () => {
    const policy = (0, memory_policy_js_1.parseMemoryPolicy)('{"route_overrides": {"review": "read-only", "dispatch": "disabled"}}');
    node_assert_1.strict.equal(policy.defaultMode, memory_policy_js_1.DEFAULT_MEMORY_MODE);
    node_assert_1.strict.equal(policy.routeOverrides.review, "read-only");
    node_assert_1.strict.equal(policy.routeOverrides.dispatch, "disabled");
});
(0, node_test_1.test)("parseMemoryPolicy normalizes route keys to lowercase", () => {
    const policy = (0, memory_policy_js_1.parseMemoryPolicy)('{"route_overrides": {"REVIEW": "disabled"}}');
    node_assert_1.strict.equal(policy.routeOverrides.review, "disabled");
    node_assert_1.strict.equal(policy.routeOverrides.REVIEW, undefined);
});
(0, node_test_1.test)("parseMemoryPolicy rejects unknown modes", () => {
    node_assert_1.strict.throws(() => (0, memory_policy_js_1.parseMemoryPolicy)('{"default_mode": "banana"}'), /default_mode must be one of/);
    node_assert_1.strict.throws(() => (0, memory_policy_js_1.parseMemoryPolicy)('{"route_overrides": {"answer": "banana"}}'), /route_overrides\.answer must be one of/);
});
(0, node_test_1.test)("parseMemoryPolicy rejects non-object route_overrides", () => {
    node_assert_1.strict.throws(() => (0, memory_policy_js_1.parseMemoryPolicy)('{"route_overrides": ["answer", "review"]}'), /route_overrides must be an object/);
});
(0, node_test_1.test)("parseMemoryPolicy rejects invalid route keys", () => {
    node_assert_1.strict.throws(() => (0, memory_policy_js_1.parseMemoryPolicy)('{"route_overrides": {"!bad": "enabled"}}'), /Invalid route override key/);
});
(0, node_test_1.test)("getMemoryModeForRoute prefers override over default", () => {
    const policy = (0, memory_policy_js_1.parseMemoryPolicy)('{"default_mode": "enabled", "route_overrides": {"review": "read-only"}}');
    node_assert_1.strict.equal((0, memory_policy_js_1.getMemoryModeForRoute)(policy, "review"), "read-only");
    node_assert_1.strict.equal((0, memory_policy_js_1.getMemoryModeForRoute)(policy, "implement"), "enabled");
});
(0, node_test_1.test)("getMemoryModeForRoute treats missing route as default mode", () => {
    const policy = (0, memory_policy_js_1.parseMemoryPolicy)('{"default_mode": "disabled"}');
    node_assert_1.strict.equal((0, memory_policy_js_1.getMemoryModeForRoute)(policy, ""), "disabled");
    node_assert_1.strict.equal((0, memory_policy_js_1.getMemoryModeForRoute)(policy, "anything"), "disabled");
});
(0, node_test_1.test)("mode predicates: read_enabled covers enabled + read-only; write_enabled covers enabled only", () => {
    node_assert_1.strict.equal((0, memory_policy_js_1.memoryModeAllowsRead)("enabled"), true);
    node_assert_1.strict.equal((0, memory_policy_js_1.memoryModeAllowsRead)("read-only"), true);
    node_assert_1.strict.equal((0, memory_policy_js_1.memoryModeAllowsRead)("disabled"), false);
    node_assert_1.strict.equal((0, memory_policy_js_1.memoryModeAllowsWrite)("enabled"), true);
    node_assert_1.strict.equal((0, memory_policy_js_1.memoryModeAllowsWrite)("read-only"), false);
    node_assert_1.strict.equal((0, memory_policy_js_1.memoryModeAllowsWrite)("disabled"), false);
});
(0, node_test_1.test)("isMemoryMode gates string inputs", () => {
    node_assert_1.strict.equal((0, memory_policy_js_1.isMemoryMode)("enabled"), true);
    node_assert_1.strict.equal((0, memory_policy_js_1.isMemoryMode)("read-only"), true);
    node_assert_1.strict.equal((0, memory_policy_js_1.isMemoryMode)("disabled"), true);
    node_assert_1.strict.equal((0, memory_policy_js_1.isMemoryMode)("anything"), false);
    node_assert_1.strict.equal((0, memory_policy_js_1.isMemoryMode)(undefined), false);
    node_assert_1.strict.equal((0, memory_policy_js_1.isMemoryMode)(42), false);
});
//# sourceMappingURL=memory-policy.test.js.map