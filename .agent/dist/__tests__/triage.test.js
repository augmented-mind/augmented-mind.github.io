"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const triage_js_1 = require("../triage.js");
const access_policy_js_1 = require("../access-policy.js");
// --- normalizeDispatch ---
(0, node_test_1.test)("normalizeDispatch reads raw JSON", () => {
    const d = (0, triage_js_1.normalizeDispatch)('{"route":"answer","needs_approval":false,"summary":"Will answer.","confidence":"high","issue_title":"","issue_body":""}');
    node_assert_1.strict.equal(d.route, "answer");
    node_assert_1.strict.equal(d.needsApproval, false);
    node_assert_1.strict.equal(d.summary, "Will answer.");
});
(0, node_test_1.test)("normalizeDispatch reads fenced JSON", () => {
    const d = (0, triage_js_1.normalizeDispatch)('```json\n{"route":"implement","needs_approval":true,"summary":"Will implement.","confidence":"high","issue_title":"feat: add X","issue_body":"body"}\n```');
    node_assert_1.strict.equal(d.route, "implement");
    node_assert_1.strict.equal(d.issueTitle, "feat: add X");
});
(0, node_test_1.test)("normalizeDispatch lowercases mixed-case routes", () => {
    const d = (0, triage_js_1.normalizeDispatch)('{"route":"Review","summary":"rev"}');
    node_assert_1.strict.equal(d.route, "review");
});
(0, node_test_1.test)("normalizeDispatch rejects empty input", () => {
    node_assert_1.strict.throws(() => (0, triage_js_1.normalizeDispatch)(""), /empty/i);
});
(0, node_test_1.test)("normalizeDispatch rejects malformed JSON", () => {
    node_assert_1.strict.throws(() => (0, triage_js_1.normalizeDispatch)("not json"), /JSON object/i);
});
(0, node_test_1.test)("normalizeDispatch rejects unsupported routes", () => {
    node_assert_1.strict.throws(() => (0, triage_js_1.normalizeDispatch)('{"route":"deploy"}'), /Unsupported dispatch route/);
});
(0, node_test_1.test)("parseAccessPolicy accepts future route override keys and GitHub associations", () => {
    const policy = (0, access_policy_js_1.parseAccessPolicy)(JSON.stringify({
        route_overrides: {
            "future-route": ["MANNEQUIN"],
        },
    }));
    node_assert_1.strict.deepEqual((0, access_policy_js_1.getAllowedAssociationsForRoute)(policy, "future-route", false), ["MANNEQUIN"]);
    node_assert_1.strict.equal((0, access_policy_js_1.isAssociationAllowedForRoute)(policy, "future-route", "mannequin", false), true);
});
(0, node_test_1.test)("parseAccessPolicy rejects malformed policy values", () => {
    node_assert_1.strict.throws(() => (0, access_policy_js_1.parseAccessPolicy)("{"), SyntaxError);
    node_assert_1.strict.throws(() => (0, access_policy_js_1.parseAccessPolicy)("[1,2,3]"), /JSON object/);
    node_assert_1.strict.throws(() => (0, access_policy_js_1.parseAccessPolicy)(JSON.stringify({ allowed_associations: [] })), /at least one author association/);
    node_assert_1.strict.throws(() => (0, access_policy_js_1.parseAccessPolicy)(JSON.stringify({ allowed_associations: ["SUPERUSER"] })), /unsupported author associations/);
    node_assert_1.strict.throws(() => (0, access_policy_js_1.parseAccessPolicy)(JSON.stringify({ route_overrides: [] })), /route_overrides must be an object/);
    node_assert_1.strict.throws(() => (0, access_policy_js_1.parseAccessPolicy)(JSON.stringify({ route_overrides: { "--invalid": ["OWNER"] } })), /Invalid route override key/);
    node_assert_1.strict.throws(() => (0, access_policy_js_1.parseAccessPolicy)(JSON.stringify({ route_overrides: { answer: [] } })), /route_overrides\.answer must contain at least one author association/);
});
(0, node_test_1.test)("extractRequestedRoute detects explicit slash routes after the agent mention", () => {
    node_assert_1.strict.equal((0, triage_js_1.extractRequestedRoute)("@sepo-agent /review this PR again", "@sepo-agent"), "review");
    node_assert_1.strict.equal((0, triage_js_1.extractRequestedRoute)("Please check this.\n\n@sepo-agent /fix-pr handle the latest comments", "@sepo-agent"), "fix-pr");
    node_assert_1.strict.equal((0, triage_js_1.extractRequestedRoute)("@sepo-agent /create-action monitor flaky tests", "@sepo-agent"), "create-action");
});
(0, node_test_1.test)("extractRequestedRouteDecision detects mention-based skill requests", () => {
    node_assert_1.strict.deepEqual((0, triage_js_1.extractRequestedRouteDecision)("@sepo-agent /skill Release-Notes summarize the changelog", "@sepo-agent"), { route: "skill", skill: "release-notes" });
});
(0, node_test_1.test)("extractRequestedRoute ignores non-route slash commands and commands without the mention", () => {
    node_assert_1.strict.equal((0, triage_js_1.extractRequestedRoute)("@sepo-agent /approve req-a1b2c3", "@sepo-agent"), "");
    node_assert_1.strict.equal((0, triage_js_1.extractRequestedRoute)("/review this PR again", "@sepo-agent"), "");
    node_assert_1.strict.deepEqual((0, triage_js_1.extractRequestedRouteDecision)("@sepo-agent /skill ../../oops", "@sepo-agent"), { route: "", skill: "" });
});
(0, node_test_1.test)("buildRequestedRouteDecision builds deterministic implement metadata without approval gate", () => {
    const d = (0, triage_js_1.buildRequestedRouteDecision)("implement", "@sepo-agent /implement add a regression test for approval routing");
    node_assert_1.strict.equal(d.route, "implement");
    // Explicit /implement is self-approval; the approval gate only applies to
    // triaged implement decisions.
    node_assert_1.strict.equal(d.needsApproval, false);
    node_assert_1.strict.equal(d.issueTitle, "Implement requested change");
    node_assert_1.strict.match(d.issueBody, /Original request/);
});
(0, node_test_1.test)("buildRequestedRouteDecision builds deterministic review metadata", () => {
    const d = (0, triage_js_1.buildRequestedRouteDecision)("review", "@sepo-agent /review");
    node_assert_1.strict.equal(d.route, "review");
    node_assert_1.strict.equal(d.needsApproval, false);
    node_assert_1.strict.equal(d.issueTitle, "");
    node_assert_1.strict.equal(d.issueBody, "");
});
(0, node_test_1.test)("buildRequestedRouteDecision builds deterministic create-action metadata", () => {
    const d = (0, triage_js_1.buildRequestedRouteDecision)("create-action", "@sepo-agent /create-action monitor flaky tests");
    node_assert_1.strict.equal(d.route, "create-action");
    node_assert_1.strict.equal(d.needsApproval, false);
    node_assert_1.strict.equal(d.issueTitle, "Create scheduled agent workflow");
    node_assert_1.strict.match(d.issueBody, /scheduled GitHub Actions workflow/);
});
(0, node_test_1.test)("buildRequestedRouteDecision supports skill routes", () => {
    const d = (0, triage_js_1.buildRequestedRouteDecision)("skill", "agent/s/release-notes");
    node_assert_1.strict.equal(d.route, "skill");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("resolveRequestedLabel maps built-in and skill labels", () => {
    node_assert_1.strict.deepEqual((0, triage_js_1.resolveRequestedLabel)("agent/review"), { route: "review", skill: "" });
    node_assert_1.strict.deepEqual((0, triage_js_1.resolveRequestedLabel)("agent/create-action"), {
        route: "create-action",
        skill: "",
    });
    node_assert_1.strict.deepEqual((0, triage_js_1.resolveRequestedLabel)("agent/s/release-notes"), {
        route: "skill",
        skill: "release-notes",
    });
});
(0, node_test_1.test)("resolveRequestedLabel normalizes skill name to lowercase", () => {
    node_assert_1.strict.deepEqual((0, triage_js_1.resolveRequestedLabel)("agent/s/Release-Notes"), {
        route: "skill",
        skill: "release-notes",
    });
});
(0, node_test_1.test)("resolveRequestedLabel rejects unsupported or malformed labels", () => {
    node_assert_1.strict.equal((0, triage_js_1.resolveRequestedLabel)("bug"), null);
    node_assert_1.strict.equal((0, triage_js_1.resolveRequestedLabel)("agent/deploy"), null);
    node_assert_1.strict.equal((0, triage_js_1.resolveRequestedLabel)("agent/s/../../oops"), null);
});
// --- applyDispatchPolicy ---
(0, node_test_1.test)("applyDispatchPolicy requires approval for triaged implement decisions", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"implement","needs_approval":false,"summary":"s","issue_title":"t","issue_body":"b"}'), "issue");
    node_assert_1.strict.equal(d.needsApproval, true);
});
(0, node_test_1.test)("applyDispatchPolicy skips approval gate for explicit implement requests", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.buildRequestedRouteDecision)("implement", "@sepo-agent /implement add foo"), "issue", "MEMBER", undefined, false, true);
    node_assert_1.strict.equal(d.route, "implement");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("applyDispatchPolicy requires approval for triaged create-action decisions", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"create-action","needs_approval":false,"summary":"s","issue_title":"t","issue_body":"b"}'), "issue");
    node_assert_1.strict.equal(d.route, "create-action");
    node_assert_1.strict.equal(d.needsApproval, true);
});
(0, node_test_1.test)("applyDispatchPolicy skips approval gate for explicit create-action requests", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.buildRequestedRouteDecision)("create-action", "@sepo-agent /create-action monitor"), "issue", "MEMBER", undefined, false, true);
    node_assert_1.strict.equal(d.route, "create-action");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("applyDispatchPolicy denies explicit implement when access policy restricts the route", () => {
    // Explicit /implement bypasses the approval gate but must still honor the
    // access policy — isExplicit=true does not mean access-unrestricted.
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.buildRequestedRouteDecision)("implement", "@sepo-agent /implement add foo"), "issue", "CONTRIBUTOR", (0, access_policy_js_1.parseAccessPolicy)(JSON.stringify({
        route_overrides: {
            implement: ["OWNER", "MEMBER"],
        },
    })), false, true);
    node_assert_1.strict.equal(d.route, "unsupported");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("applyDispatchPolicy dispatches fix-pr on PR without approval", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"fix-pr","needs_approval":true,"summary":"fix"}'), "pull_request", "MEMBER");
    node_assert_1.strict.equal(d.route, "fix-pr");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("applyDispatchPolicy overrides model approval for fix-pr on PR", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"fix-pr","needs_approval":true,"summary":"fix it"}'), "pull_request", "OWNER");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("applyDispatchPolicy uses default private repo access for fix-pr", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"fix-pr","summary":"fix"}'), "pull_request", "CONTRIBUTOR");
    node_assert_1.strict.equal(d.route, "fix-pr");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("applyDispatchPolicy dispatches review on PR without approval", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"review","summary":"review it"}'), "pull_request", "MEMBER");
    node_assert_1.strict.equal(d.route, "review");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("applyDispatchPolicy rejects review requests outside pull requests", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"review","summary":"review it"}'), "issue");
    node_assert_1.strict.equal(d.route, "unsupported");
});
(0, node_test_1.test)("applyDispatchPolicy rejects fix-pr requests outside pull requests", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"fix-pr","summary":"fix"}'), "issue");
    node_assert_1.strict.equal(d.route, "unsupported");
});
(0, node_test_1.test)("applyDispatchPolicy keeps skill requests as immediate inline runs", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.buildRequestedRouteDecision)("skill", "agent/s/release-notes"), "issue");
    node_assert_1.strict.equal(d.route, "skill");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("applyDispatchPolicy rejects routes disallowed by configured access policy", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"review","summary":"review it"}'), "pull_request", "CONTRIBUTOR", (0, access_policy_js_1.parseAccessPolicy)(JSON.stringify({
        route_overrides: {
            review: ["OWNER", "MEMBER", "COLLABORATOR"],
        },
    })));
    node_assert_1.strict.equal(d.route, "unsupported");
    node_assert_1.strict.match(d.summary, /OWNER, MEMBER, COLLABORATOR/);
});
(0, node_test_1.test)("applyDispatchPolicy allows contributors by default for public repos", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"answer","summary":"answer it"}'), "issue", "CONTRIBUTOR", (0, access_policy_js_1.parseAccessPolicy)(""), true);
    node_assert_1.strict.equal(d.route, "answer");
    node_assert_1.strict.equal(d.needsApproval, false);
});
(0, node_test_1.test)("applyDispatchPolicy allows route overrides to widen public repo access", () => {
    const d = (0, triage_js_1.applyDispatchPolicy)((0, triage_js_1.normalizeDispatch)('{"route":"fix-pr","summary":"fix it"}'), "pull_request", "CONTRIBUTOR", (0, access_policy_js_1.parseAccessPolicy)(JSON.stringify({
        route_overrides: {
            "fix-pr": ["OWNER", "MEMBER", "COLLABORATOR", "CONTRIBUTOR"],
        },
    })), true);
    node_assert_1.strict.equal(d.route, "fix-pr");
    node_assert_1.strict.equal(d.needsApproval, false);
});
//# sourceMappingURL=triage.test.js.map