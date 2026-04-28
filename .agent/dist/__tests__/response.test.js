"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const response_js_1 = require("../response.js");
// --- determineRunStatus ---
(0, node_test_1.test)("determineRunStatus returns failed when agent exit is non-zero", () => {
    node_assert_1.strict.equal((0, response_js_1.determineRunStatus)(1, true, 0), "failed");
});
(0, node_test_1.test)("determineRunStatus returns no_changes when agent succeeded but no changes", () => {
    node_assert_1.strict.equal((0, response_js_1.determineRunStatus)(0, false, 0), "no_changes");
});
(0, node_test_1.test)("determineRunStatus returns success for clean branch head updates", () => {
    node_assert_1.strict.equal((0, response_js_1.determineRunStatus)(0, false, 0, true), "success");
});
(0, node_test_1.test)("determineRunStatus returns verify_failed for changed head when verify fails", () => {
    node_assert_1.strict.equal((0, response_js_1.determineRunStatus)(0, false, 1, true), "verify_failed");
});
(0, node_test_1.test)("determineRunStatus returns verify_failed when verify fails", () => {
    node_assert_1.strict.equal((0, response_js_1.determineRunStatus)(0, true, 1), "verify_failed");
});
(0, node_test_1.test)("determineRunStatus returns success when all checks pass", () => {
    node_assert_1.strict.equal((0, response_js_1.determineRunStatus)(0, true, 0), "success");
});
// --- extractJsonObject ---
(0, node_test_1.test)("extractJsonObject extracts raw JSON", () => {
    const json = (0, response_js_1.extractJsonObject)('{"summary":"done","pr_title":"feat: test"}');
    node_assert_1.strict.equal(JSON.parse(json).summary, "done");
});
(0, node_test_1.test)("extractJsonObject extracts fenced JSON", () => {
    const json = (0, response_js_1.extractJsonObject)('```json\n{"summary":"done"}\n```');
    node_assert_1.strict.equal(JSON.parse(json).summary, "done");
});
(0, node_test_1.test)("extractJsonObject handles nested braces in strings", () => {
    const json = (0, response_js_1.extractJsonObject)('{"body":"a { b } c"}');
    node_assert_1.strict.equal(JSON.parse(json).body, "a { b } c");
});
(0, node_test_1.test)("extractJsonObject returns empty for no JSON", () => {
    node_assert_1.strict.equal((0, response_js_1.extractJsonObject)("just plain text"), "");
});
// --- normalizeImplementationResponse ---
(0, node_test_1.test)("normalizeImplementationResponse parses valid JSON", () => {
    const result = (0, response_js_1.normalizeImplementationResponse)('{"summary":"Added feature","commit_message":"feat: add it","pr_title":"feat: add it","pr_body":"## Changes\\n- done"}');
    node_assert_1.strict.equal(result.summary, "Added feature");
    node_assert_1.strict.equal(result.commitMessage, "feat: add it");
    node_assert_1.strict.equal(result.prTitle, "feat: add it");
    node_assert_1.strict.match(result.prBody, /Changes/);
});
(0, node_test_1.test)("normalizeImplementationResponse falls back to plain text", () => {
    const result = (0, response_js_1.normalizeImplementationResponse)("Just some plain text output");
    node_assert_1.strict.equal(result.summary, "Just some plain text output");
    node_assert_1.strict.equal(result.commitMessage, "");
    node_assert_1.strict.equal(result.prTitle, "");
    node_assert_1.strict.equal(result.prBody, "");
});
(0, node_test_1.test)("normalizeImplementationResponse handles empty input", () => {
    const result = (0, response_js_1.normalizeImplementationResponse)("");
    node_assert_1.strict.equal(result.summary, "");
    node_assert_1.strict.equal(result.commitMessage, "");
});
(0, node_test_1.test)("normalizeImplementationResponse normalizes commit message whitespace", () => {
    const result = (0, response_js_1.normalizeImplementationResponse)('{"summary":"Added feature","commit_message":"feat:   add\\nfeature"}');
    node_assert_1.strict.equal(result.commitMessage, "feat: add feature");
});
(0, node_test_1.test)("summaryFromAgentResponse parses fix-pr JSON summaries", () => {
    const summary = (0, response_js_1.summaryFromAgentResponse)("fix-pr", '{"summary":"- Fixed the failing parser\\n- Added coverage","commit_message":"fix: repair parser"}');
    node_assert_1.strict.equal(summary, "- Fixed the failing parser\n- Added coverage");
});
(0, node_test_1.test)("summaryFromAgentResponse leaves review text unchanged", () => {
    const summary = (0, response_js_1.summaryFromAgentResponse)("review", "## Summary\nLooks good.");
    node_assert_1.strict.equal(summary, "## Summary\nLooks good.");
});
// --- formatImplementComment ---
(0, node_test_1.test)("formatImplementComment formats success with PR link", () => {
    const body = (0, response_js_1.formatImplementComment)({
        status: "success",
        summary: "Added the feature.",
        branch: "agent/codex-42",
        prUrl: "https://github.com/org/repo/pull/43",
    });
    node_assert_1.strict.match(body, /implementation finished/);
    node_assert_1.strict.match(body, /agent\/codex-42/);
    node_assert_1.strict.match(body, /pull\/43/);
});
(0, node_test_1.test)("formatImplementComment formats no_changes", () => {
    const body = (0, response_js_1.formatImplementComment)({ status: "no_changes" });
    node_assert_1.strict.match(body, /did not produce code changes/);
});
// --- formatFixPrComment ---
(0, node_test_1.test)("formatFixPrComment formats success", () => {
    const body = (0, response_js_1.formatFixPrComment)({
        status: "success",
        branch: "feat/my-branch",
        requestedBy: "alice",
    });
    node_assert_1.strict.match(body, /pushed fixes/);
    node_assert_1.strict.match(body, /@alice/);
});
(0, node_test_1.test)("formatFixPrComment formats unsupported", () => {
    const body = (0, response_js_1.formatFixPrComment)({ status: "unsupported" });
    node_assert_1.strict.match(body, /could not update this PR/);
});
// --- formatReviewComment ---
(0, node_test_1.test)("formatReviewComment builds synthesis header", () => {
    const body = (0, response_js_1.formatReviewComment)({
        synthesisBody: "## Summary\nLooks good.",
        requestedBy: "bob",
    });
    node_assert_1.strict.match(body, /AI Review Synthesis/);
    node_assert_1.strict.match(body, /<!-- sepo-agent-review-synthesis -->/);
    node_assert_1.strict.match(body, /@bob/);
    node_assert_1.strict.match(body, /Looks good/);
});
// --- formatRubricsUpdateComment ---
(0, node_test_1.test)("formatRubricsUpdateComment reports committed updates with summary", () => {
    const body = (0, response_js_1.formatRubricsUpdateComment)({
        prNumber: 286,
        rubricsRef: "agent/rubrics",
        rubricsCommitted: true,
        runSucceeded: true,
        summary: "Added docs sync rubric.",
    });
    node_assert_1.strict.match(body, /Rubrics Update/);
    node_assert_1.strict.match(body, /Updated `agent\/rubrics` from PR #286/);
    node_assert_1.strict.match(body, /Added docs sync rubric/);
});
(0, node_test_1.test)("formatRubricsUpdateComment reports no changes", () => {
    const body = (0, response_js_1.formatRubricsUpdateComment)({
        prNumber: "286",
        rubricsRef: "agent/rubrics",
        rubricsCommitted: false,
        runSucceeded: true,
        summary: "no rubric changes",
    });
    node_assert_1.strict.match(body, /No changes were committed to `agent\/rubrics` from PR #286/);
    node_assert_1.strict.match(body, /no rubric changes/);
});
(0, node_test_1.test)("formatRubricsUpdateComment reports failed runs", () => {
    const body = (0, response_js_1.formatRubricsUpdateComment)({
        prNumber: "286",
        rubricsRef: "agent/rubrics",
        rubricsCommitted: false,
        runSucceeded: false,
    });
    node_assert_1.strict.match(body, /did not complete successfully/);
});
//# sourceMappingURL=response.test.js.map