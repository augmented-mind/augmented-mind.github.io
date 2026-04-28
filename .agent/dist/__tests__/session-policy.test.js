"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const session_policy_js_1 = require("../session-policy.js");
(0, node_test_1.test)("parseSessionPolicy accepts only explicit policy values", () => {
    node_assert_1.strict.equal((0, session_policy_js_1.parseSessionPolicy)("none"), "none");
    node_assert_1.strict.equal((0, session_policy_js_1.parseSessionPolicy)("track-only"), "track-only");
    node_assert_1.strict.equal((0, session_policy_js_1.parseSessionPolicy)("resume-best-effort"), "resume-best-effort");
    node_assert_1.strict.equal((0, session_policy_js_1.parseSessionPolicy)("resume-required"), "resume-required");
});
(0, node_test_1.test)("parseSessionPolicy rejects empty or invalid values", () => {
    node_assert_1.strict.equal((0, session_policy_js_1.parseSessionPolicy)(""), null);
    node_assert_1.strict.equal((0, session_policy_js_1.parseSessionPolicy)(undefined), null);
    node_assert_1.strict.equal((0, session_policy_js_1.parseSessionPolicy)("wat"), null);
});
(0, node_test_1.test)("sessionModeForPolicy derives exec vs persistent explicitly from policy", () => {
    node_assert_1.strict.equal((0, session_policy_js_1.sessionModeForPolicy)("none"), "exec");
    node_assert_1.strict.equal((0, session_policy_js_1.sessionModeForPolicy)("track-only"), "persistent");
    node_assert_1.strict.equal((0, session_policy_js_1.sessionModeForPolicy)("resume-best-effort"), "persistent");
    node_assert_1.strict.equal((0, session_policy_js_1.sessionModeForPolicy)("resume-required"), "persistent");
});
(0, node_test_1.test)("policy predicates separate tracking, resume, and strict continuity", () => {
    node_assert_1.strict.equal((0, session_policy_js_1.tracksThreadState)("none"), false);
    node_assert_1.strict.equal((0, session_policy_js_1.tracksThreadState)("track-only"), true);
    node_assert_1.strict.equal((0, session_policy_js_1.tracksThreadState)("resume-best-effort"), true);
    node_assert_1.strict.equal((0, session_policy_js_1.tracksThreadState)("resume-required"), true);
    node_assert_1.strict.equal((0, session_policy_js_1.attemptsResume)("none"), false);
    node_assert_1.strict.equal((0, session_policy_js_1.attemptsResume)("track-only"), false);
    node_assert_1.strict.equal((0, session_policy_js_1.attemptsResume)("resume-best-effort"), true);
    node_assert_1.strict.equal((0, session_policy_js_1.attemptsResume)("resume-required"), true);
    node_assert_1.strict.equal((0, session_policy_js_1.requiresResumeContinuity)("none"), false);
    node_assert_1.strict.equal((0, session_policy_js_1.requiresResumeContinuity)("track-only"), false);
    node_assert_1.strict.equal((0, session_policy_js_1.requiresResumeContinuity)("resume-best-effort"), false);
    node_assert_1.strict.equal((0, session_policy_js_1.requiresResumeContinuity)("resume-required"), true);
});
//# sourceMappingURL=session-policy.test.js.map