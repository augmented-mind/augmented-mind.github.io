"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const handoff_js_1 = require("../handoff.js");
(0, node_test_1.test)("handoff skips when automation mode is disabled", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "disabled",
        sourceAction: "implement",
        sourceConclusion: "success",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "skip");
    node_assert_1.strict.equal(decision.nextAction, undefined);
});
(0, node_test_1.test)("agent mode validates planner handoff against policy", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "implement",
        sourceConclusion: "success",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "review",
            reason: "Implementation produced a PR.",
            handoffContext: "Review the new PR with special attention to generated workflow permissions.",
        },
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "review");
    node_assert_1.strict.equal(decision.targetNumber, "99");
    node_assert_1.strict.match(decision.reason, /agent planner selected review/);
    node_assert_1.strict.equal(decision.handoffContext, "Review the new PR with special attention to generated workflow permissions.");
});
(0, node_test_1.test)("agent mode leaves handoff context empty when planner omits it", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        plannerDecision: {
            decision: "handoff",
            nextAction: "fix-pr",
            reason: "Review found minor issues.",
        },
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "fix-pr");
    node_assert_1.strict.equal(decision.handoffContext, undefined);
});
(0, node_test_1.test)("agent mode stops invalid or disallowed planner handoffs", () => {
    const disallowed = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "implement",
        sourceConclusion: "verify_failed",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
        plannerDecision: { decision: "handoff", nextAction: "review", reason: "Try anyway." },
    });
    node_assert_1.strict.equal(disallowed.decision, "stop");
    node_assert_1.strict.match(disallowed.reason, /policy disallows/);
    const wrongEdge = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        plannerDecision: { decision: "handoff", nextAction: "review", reason: "Review again." },
    });
    node_assert_1.strict.equal(wrongEdge.decision, "stop");
    node_assert_1.strict.match(wrongEdge.reason, /policy only allows fix-pr/);
});
(0, node_test_1.test)("agent mode respects planner stop, invalid planner output, and round budget", () => {
    const stopped = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
        plannerDecision: { decision: "stop", reason: "Leave the remaining work to a maintainer." },
    });
    node_assert_1.strict.equal(stopped.decision, "stop");
    node_assert_1.strict.match(stopped.reason, /agent planner stop/);
    const invalid = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(invalid.decision, "stop");
    node_assert_1.strict.match(invalid.reason, /planner decision missing/);
    const exhausted = (0, handoff_js_1.decideHandoff)({
        automationMode: "agent",
        sourceAction: "review",
        sourceConclusion: "minor_issues",
        targetNumber: "99",
        currentRound: 5,
        maxRounds: 5,
        plannerDecision: { decision: "handoff", nextAction: "fix-pr", reason: "Try another fix pass." },
    });
    node_assert_1.strict.equal(exhausted.decision, "stop");
    node_assert_1.strict.match(exhausted.reason, /budget/);
});
(0, node_test_1.test)("implement success dispatches review for the created PR", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "implement",
        sourceConclusion: "success",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "review");
    node_assert_1.strict.equal(decision.targetNumber, "99");
    node_assert_1.strict.equal(decision.nextRound, 2);
});
(0, node_test_1.test)("implement stops on failures and missing PR targets", () => {
    const failed = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "implement",
        sourceConclusion: "verify_failed",
        targetNumber: "42",
        nextTargetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(failed.decision, "stop");
    node_assert_1.strict.match(failed.reason, /verify_failed/);
    const missingPr = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "implement",
        sourceConclusion: "success",
        targetNumber: "42",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(missingPr.decision, "stop");
    node_assert_1.strict.match(missingPr.reason, /pull request target/);
});
(0, node_test_1.test)("review verdicts dispatch fix-pr or stop", () => {
    for (const verdict of ["NEEDS_REWORK", "CHANGES_REQUESTED", "minor-issues"]) {
        const needsFix = (0, handoff_js_1.decideHandoff)({
            automationMode: "heuristics",
            sourceAction: "review",
            sourceConclusion: verdict,
            targetNumber: "99",
            currentRound: 2,
            maxRounds: 5,
        });
        node_assert_1.strict.equal(needsFix.decision, "dispatch");
        node_assert_1.strict.equal(needsFix.nextAction, "fix-pr");
        node_assert_1.strict.equal(needsFix.targetNumber, "99");
    }
    const ship = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "review",
        sourceConclusion: "SHIP",
        targetNumber: "99",
        currentRound: 2,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(ship.decision, "stop");
    node_assert_1.strict.match(ship.reason, /SHIP/);
});
(0, node_test_1.test)("fix-pr success dispatches review until the round budget is exhausted", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "fix-pr",
        sourceConclusion: "success",
        targetNumber: "99",
        currentRound: 4,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "dispatch");
    node_assert_1.strict.equal(decision.nextAction, "review");
    const exhausted = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "fix-pr",
        sourceConclusion: "success",
        targetNumber: "99",
        currentRound: 5,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(exhausted.decision, "stop");
    node_assert_1.strict.match(exhausted.reason, /budget/);
});
(0, node_test_1.test)("unsupported actions stop", () => {
    const decision = (0, handoff_js_1.decideHandoff)({
        automationMode: "heuristics",
        sourceAction: "deploy",
        sourceConclusion: "success",
        targetNumber: "99",
        currentRound: 1,
        maxRounds: 5,
    });
    node_assert_1.strict.equal(decision.decision, "stop");
    node_assert_1.strict.match(decision.reason, /unsupported/);
});
(0, node_test_1.test)("extractReviewConclusion reads final verdict markdown", () => {
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewConclusion)("## Final Verdict\n- `MINOR_ISSUES`"), "minor_issues");
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewConclusion)("Final answer\n\n## Final Verdict\nSHIP"), "ship");
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewConclusion)("This needs-rework before another pass"), "needs_rework");
    node_assert_1.strict.equal((0, handoff_js_1.extractReviewConclusion)("No verdict here"), "unknown");
});
(0, node_test_1.test)("handoff dedupe markers are deterministic and detectable", () => {
    const key = (0, handoff_js_1.buildHandoffDedupeKey)({
        repo: "Self-Evolving/Repo",
        sourceRunId: "12345",
        sourceAction: "fix-pr",
        sourceTargetNumber: "99",
        nextAction: "review",
        nextTargetNumber: "99",
        nextRound: 3,
    });
    node_assert_1.strict.equal(key, "handoff:self-evolving/repo:12345:fix_pr:99:review:99:3");
    const marker = (0, handoff_js_1.buildHandoffMarker)(key, "pending", 1_000);
    node_assert_1.strict.ok((0, handoff_js_1.hasHandoffMarker)(`comment body\n${marker}`, key));
    node_assert_1.strict.equal((0, handoff_js_1.getHandoffMarkerState)(`comment body\n${marker}`, key), "pending");
    node_assert_1.strict.deepEqual((0, handoff_js_1.parseHandoffMarker)(marker, key), { state: "pending", createdAtMs: 1_000 });
    node_assert_1.strict.equal((0, handoff_js_1.getHandoffMarkerState)((0, handoff_js_1.buildHandoffMarker)(key, "failed"), key), "failed");
    node_assert_1.strict.equal((0, handoff_js_1.getHandoffMarkerState)((0, handoff_js_1.buildHandoffMarker)(key), key), "dispatched");
    node_assert_1.strict.equal((0, handoff_js_1.hasHandoffMarker)("comment body", key), false);
});
(0, node_test_1.test)("pending handoff markers become stale after the ttl", () => {
    node_assert_1.strict.equal((0, handoff_js_1.isPendingHandoffMarkerStale)({ state: "pending", createdAtMs: 1_000 }, 3_000, 1_000), true);
    node_assert_1.strict.equal((0, handoff_js_1.isPendingHandoffMarkerStale)({ state: "pending", createdAtMs: 2_500 }, 3_000, 1_000), false);
    node_assert_1.strict.equal((0, handoff_js_1.isPendingHandoffMarkerStale)({ state: "pending", createdAtMs: null }, 3_000, 1_000), true);
    node_assert_1.strict.equal((0, handoff_js_1.isPendingHandoffMarkerStale)({ state: "dispatched", createdAtMs: 1_000 }, 3_000, 1_000), false);
});
(0, node_test_1.test)("automation mode parsing supports disabled, heuristics, and boolean compatibility aliases", () => {
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("disabled"), "disabled");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("false"), "disabled");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("heuristics"), "heuristics");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("true"), "heuristics");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("agent"), "agent");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("heuristic"), "disabled");
    node_assert_1.strict.equal((0, handoff_js_1.normalizeAutomationMode)("deterministic"), "disabled");
    node_assert_1.strict.equal((0, handoff_js_1.automationModeAllowsHandoff)("heuristics"), true);
    node_assert_1.strict.equal((0, handoff_js_1.automationModeAllowsHandoff)("agent"), true);
    node_assert_1.strict.equal((0, handoff_js_1.automationModeAllowsHandoff)("heuristic"), false);
    node_assert_1.strict.equal((0, handoff_js_1.automationModeAllowsHandoff)("deterministic"), false);
});
(0, node_test_1.test)("parsePlannerDecision reads planner JSON", () => {
    node_assert_1.strict.deepEqual((0, handoff_js_1.parsePlannerDecision)([
        "```json",
        '{"decision":"handoff","next_action":"fix-pr","reason":"Needs changes.","handoff_context":"Only update tests for the failing review findings."}',
        "```",
    ].join("\n")), {
        decision: "handoff",
        nextAction: "fix-pr",
        reason: "Needs changes.",
        handoffContext: "Only update tests for the failing review findings.",
    });
    node_assert_1.strict.deepEqual((0, handoff_js_1.parsePlannerDecision)('{"decision":"blocked","reason":"Missing PR."}'), { decision: "blocked", nextAction: undefined, reason: "Missing PR." });
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)('{"decision":"handoff","nextAction":"fix-pr","reason":"Alias.","handoffContext":"camel case works"}')?.handoffContext, "camel case works");
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)("not json"), null);
    node_assert_1.strict.equal((0, handoff_js_1.parsePlannerDecision)('{"decision":"handoff","next_action":"deploy"}')?.nextAction, undefined);
});
//# sourceMappingURL=handoff.test.js.map