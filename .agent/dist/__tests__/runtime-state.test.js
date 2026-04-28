"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const runtime_state_js_1 = require("../runtime-state.js");
const thread_state_js_1 = require("../thread-state.js");
(0, node_test_1.test)("resumeSessionIdFromState only returns ids for resume policies", () => {
    const state = (0, thread_state_js_1.updateThreadState)((0, thread_state_js_1.createThreadState)("repo:issue:1:answer:default"), {
        acpxSessionId: "ses-123",
    });
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromState)("none", state), undefined);
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromState)("track-only", state), undefined);
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromState)("resume-best-effort", state), "ses-123");
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromState)("resume-required", state), "ses-123");
});
(0, node_test_1.test)("resumeSessionIdFromForkSource seeds resume-capable threads without destination identity", () => {
    const existingWithIdentity = (0, thread_state_js_1.updateThreadState)((0, thread_state_js_1.createThreadState)("repo:issue:1:implement:default"), {
        acpxSessionId: "ses-destination",
    });
    const existingWithoutIdentity = (0, thread_state_js_1.createThreadState)("repo:issue:1:implement:default");
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromForkSource)("none", null, "ses-source"), undefined);
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromForkSource)("track-only", null, "ses-source"), undefined);
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromForkSource)("resume-best-effort", existingWithIdentity, "ses-source"), undefined);
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromForkSource)("resume-best-effort", null, ""), undefined);
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromForkSource)("resume-best-effort", null, "ses-source"), "ses-source");
    node_assert_1.strict.equal((0, runtime_state_js_1.resumeSessionIdFromForkSource)("resume-best-effort", existingWithoutIdentity, "ses-source"), "ses-source");
});
(0, node_test_1.test)("shouldUseContinuationPrompt only allows destination session resumes", () => {
    const existingWithIdentity = (0, thread_state_js_1.updateThreadState)((0, thread_state_js_1.createThreadState)("repo:issue:1:answer:default"), {
        acpxSessionId: "ses-destination",
    });
    const existingWithoutIdentity = (0, thread_state_js_1.createThreadState)("repo:issue:1:implement:default");
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldUseContinuationPrompt)(existingWithIdentity, "ses-destination"), true);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldUseContinuationPrompt)(existingWithIdentity, "ses-source"), false);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldUseContinuationPrompt)(existingWithoutIdentity, "ses-source"), false);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldUseContinuationPrompt)(null, "ses-source"), false);
});
(0, node_test_1.test)("buildRunningThreadStateFields resets resume metadata for a new attempt", () => {
    node_assert_1.strict.deepEqual((0, runtime_state_js_1.buildRunningThreadStateFields)(), {
        resume_status: "not_attempted",
        last_resume_error: "",
        resumed_from_session_id: "",
    });
});
(0, node_test_1.test)("buildThreadStateFieldsFromEnsureOutcome maps resumed and fallback outcomes", () => {
    node_assert_1.strict.deepEqual((0, runtime_state_js_1.buildThreadStateFieldsFromEnsureOutcome)({ kind: "resumed", resumedFromSessionId: "ses-old" }), {
        resume_status: "resumed",
        last_resume_error: "",
        resumed_from_session_id: "ses-old",
    });
    node_assert_1.strict.deepEqual((0, runtime_state_js_1.buildThreadStateFieldsFromEnsureOutcome)({
        kind: "resume_fallback",
        resumedFromSessionId: "ses-old",
        error: "expired",
    }), {
        resume_status: "fallback_fresh",
        last_resume_error: "expired",
        resumed_from_session_id: "ses-old",
    });
});
(0, node_test_1.test)("buildThreadStateFieldsFromEnsureOutcome maps failed and non-resume outcomes", () => {
    node_assert_1.strict.deepEqual((0, runtime_state_js_1.buildThreadStateFieldsFromEnsureOutcome)({
        kind: "failed",
        resumedFromSessionId: "ses-old",
        error: "resume + fresh failed",
    }), {
        resume_status: "failed",
        last_resume_error: "resume + fresh failed",
        resumed_from_session_id: "ses-old",
    });
    node_assert_1.strict.deepEqual((0, runtime_state_js_1.buildThreadStateFieldsFromEnsureOutcome)({ kind: "fresh" }), (0, runtime_state_js_1.buildRunningThreadStateFields)());
    node_assert_1.strict.deepEqual((0, runtime_state_js_1.buildThreadStateFieldsFromEnsureOutcome)({ kind: "not_applicable" }), (0, runtime_state_js_1.buildRunningThreadStateFields)());
});
(0, node_test_1.test)("buildCompletedThreadStateUpdates preserves identity absence and records fallback", () => {
    node_assert_1.strict.deepEqual((0, runtime_state_js_1.buildCompletedThreadStateUpdates)({
        outcome: {
            kind: "resume_fallback",
            resumedFromSessionId: "ses-old",
            error: "expired",
        },
        identity: null,
    }), {
        resume_status: "fallback_fresh",
        last_resume_error: "expired",
        resumed_from_session_id: "ses-old",
    });
    node_assert_1.strict.deepEqual((0, runtime_state_js_1.buildCompletedThreadStateUpdates)({
        outcome: { kind: "resumed", resumedFromSessionId: "ses-old" },
        identity: { acpxRecordId: "rec-new", acpxSessionId: "ses-new" },
    }), {
        resume_status: "resumed",
        last_resume_error: "",
        resumed_from_session_id: "ses-old",
        acpxRecordId: "rec-new",
        acpxSessionId: "ses-new",
    });
});
(0, node_test_1.test)("buildFailedThreadStateUpdates records resume failure details", () => {
    node_assert_1.strict.deepEqual((0, runtime_state_js_1.buildFailedThreadStateUpdates)({
        kind: "failed",
        resumedFromSessionId: "ses-old",
        error: "boom",
    }), {
        resume_status: "failed",
        last_resume_error: "boom",
        resumed_from_session_id: "ses-old",
    });
});
(0, node_test_1.test)("strict continuity fails on fallback or thread-state errors only for resume-required", () => {
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailRunBecauseOfEnsureOutcome)("resume-best-effort", {
        kind: "resume_fallback",
        resumedFromSessionId: "ses-old",
        error: "expired",
    }), false);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailRunBecauseOfEnsureOutcome)("resume-required", {
        kind: "resume_fallback",
        resumedFromSessionId: "ses-old",
        error: "expired",
    }), true);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailRunBecauseOfEnsureOutcome)("resume-required", { kind: "resumed", resumedFromSessionId: "ses-old" }), false);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailRunBecauseOfEnsureOutcome)("resume-required", { kind: "fresh" }), false);
    const existing = (0, thread_state_js_1.updateThreadState)((0, thread_state_js_1.createThreadState)("repo:pr:7:fix-pr:default"), {
        acpxSessionId: "",
    });
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailBecauseRequiredResumeIdentityMissing)("resume-required", existing, undefined), true);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailBecauseRequiredResumeIdentityMissing)("resume-best-effort", existing, undefined), false);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailBecauseRequiredResumeIdentityMissing)("resume-required", null, undefined), false);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailRunBecauseOfThreadStateError)("track-only"), false);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailRunBecauseOfThreadStateError)("resume-best-effort"), false);
    node_assert_1.strict.equal((0, runtime_state_js_1.shouldFailRunBecauseOfThreadStateError)("resume-required"), true);
});
//# sourceMappingURL=runtime-state.test.js.map