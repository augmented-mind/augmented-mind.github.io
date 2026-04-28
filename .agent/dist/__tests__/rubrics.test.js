"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const rubrics_js_1 = require("../rubrics.js");
const select_js_1 = require("../cli/rubrics/select.js");
const rubrics_policy_js_1 = require("../rubrics-policy.js");
const resolve_policy_js_1 = require("../cli/rubrics/resolve-policy.js");
function tempDir() {
    return (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "rubrics-test-"));
}
function writeRubric(root, name, body) {
    const dir = (0, node_path_1.join)(root, "rubrics", "coding");
    (0, rubrics_js_1.ensureRubricsStructure)(root, "self-evolving/repo");
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(dir, name), body, "utf8");
}
function withoutGithubOutput(fn) {
    const previous = process.env.GITHUB_OUTPUT;
    delete process.env.GITHUB_OUTPUT;
    try {
        return fn();
    }
    finally {
        if (previous === undefined) {
            delete process.env.GITHUB_OUTPUT;
        }
        else {
            process.env.GITHUB_OUTPUT = previous;
        }
    }
}
(0, node_test_1.default)("ensureRubricsStructure seeds the user/team rubric branch layout", () => {
    const root = tempDir();
    const result = (0, rubrics_js_1.ensureRubricsStructure)(root, "self-evolving/repo");
    strict_1.default.ok(result.createdFiles.some((file) => file.endsWith("README.md")));
    strict_1.default.ok(result.createdFiles.some((file) => file.endsWith("rubrics/coding/.gitkeep")));
});
(0, node_test_1.default)("loadRubrics validates and normalizes rubric YAML", () => {
    const root = tempDir();
    writeRubric(root, "add-regression-tests.yaml", `
schema_version: 1
id: add-regression-tests
title: Add regression tests
description: >-
  Bug fixes should include regression tests.
type: generic
domain: coding_workflow
applies_to:
  - implement
severity: must
weight: 5
status: active
examples:
  - source: https://example.test/pr/1
    note: Reviewer requested a regression test.
`);
    const { rubrics, errors } = (0, rubrics_js_1.loadRubrics)(root);
    strict_1.default.deepEqual(errors, []);
    strict_1.default.equal(rubrics.length, 1);
    strict_1.default.equal(rubrics[0]?.id, "add-regression-tests");
    strict_1.default.equal(rubrics[0]?.severity, "must");
    strict_1.default.equal(rubrics[0]?.path, "rubrics/coding/add-regression-tests.yaml");
});
(0, node_test_1.default)("loadRubrics accepts legacy category coding as coding_workflow", () => {
    const root = tempDir();
    writeRubric(root, "legacy.yaml", `
id: legacy-category
title: Legacy category
description: Legacy category should still load.
category: coding
applies_to: [implement]
`);
    const { rubrics, errors } = (0, rubrics_js_1.loadRubrics)(root);
    strict_1.default.deepEqual(errors, []);
    strict_1.default.equal(rubrics[0]?.domain, "coding_workflow");
});
(0, node_test_1.default)("loadRubrics rejects duplicate ids", () => {
    const root = tempDir();
    const body = `
id: duplicate-rubric
title: Duplicate
description: Same id.
applies_to: [implement]
`;
    writeRubric(root, "one.yaml", body);
    writeRubric(root, "two.yaml", body);
    const { rubrics, errors } = (0, rubrics_js_1.loadRubrics)(root);
    strict_1.default.equal(rubrics.length, 1);
    strict_1.default.equal(errors.length, 1);
    strict_1.default.match(errors[0]?.message || "", /duplicate id/);
});
(0, node_test_1.default)("loadRubrics rejects unsupported schema versions and invalid weights", () => {
    const root = tempDir();
    writeRubric(root, "schema.yaml", `
schema_version: 2
id: future-rubric
title: Future schema
description: Future schema should not silently load.
applies_to: [implement]
`);
    writeRubric(root, "weight.yaml", `
id: bad-weight
title: Bad weight
description: Weight should be an integer from 1 to 10.
applies_to: [implement]
weight: 12
`);
    const { rubrics, errors } = (0, rubrics_js_1.loadRubrics)(root);
    strict_1.default.equal(rubrics.length, 0);
    strict_1.default.equal(errors.length, 2);
    strict_1.default.ok(errors.some((error) => /schema_version must be 1/.test(error.message)));
    strict_1.default.ok(errors.some((error) => /weight must be an integer from 1 to 10/.test(error.message)));
});
(0, node_test_1.default)("selectRubrics filters by route and ranks by query matches", () => {
    const root = tempDir();
    writeRubric(root, "regression.yaml", `
id: add-regression-tests
title: Add regression tests
description: Include regression tests for bug fixes.
applies_to: [implement]
severity: must
weight: 5
`);
    writeRubric(root, "concise.yaml", `
id: concise-summary
title: Keep summaries concise
description: PR comments should be concise.
domain: communication
applies_to: [answer]
severity: should
weight: 2
`);
    const { selected, errors } = (0, rubrics_js_1.selectRubrics)({
        rootDir: root,
        route: "implement",
        query: "fix bug regression test",
    });
    strict_1.default.deepEqual(errors, []);
    strict_1.default.equal(selected.length, 1);
    strict_1.default.equal(selected[0]?.rubric.id, "add-regression-tests");
    strict_1.default.ok(selected[0]?.matchedTerms.includes("regression"));
});
(0, node_test_1.default)("selectRubrics applies implementation rubrics to fix-pr", () => {
    const root = tempDir();
    writeRubric(root, "implementation.yaml", `
id: implementation-guidance
title: Implementation guidance
description: PR fixes should reuse implementation guidance.
applies_to: [implement]
severity: should
`);
    const { selected, errors } = (0, rubrics_js_1.selectRubrics)({
        rootDir: root,
        route: "fix-pr",
        query: "fix pull request",
    });
    strict_1.default.deepEqual(errors, []);
    strict_1.default.equal(selected[0]?.rubric.id, "implementation-guidance");
});
(0, node_test_1.default)("selectRubrics can include all routes for rubric review", () => {
    const root = tempDir();
    writeRubric(root, "implementation.yaml", `
id: implementation-guidance
title: Implementation guidance
description: Implementation guidance should be available to rubric review.
applies_to: [implement]
severity: should
`);
    writeRubric(root, "answer.yaml", `
id: answer-guidance
title: Answer guidance
description: Answer guidance should also be available to rubric review.
domain: communication
applies_to: [answer]
severity: should
`);
    const routeFiltered = (0, rubrics_js_1.selectRubrics)({
        rootDir: root,
        route: "rubrics-review",
        query: "",
    });
    strict_1.default.equal(routeFiltered.selected.length, 0);
    const allRoutes = (0, rubrics_js_1.selectRubrics)({
        rootDir: root,
        route: "rubrics-review",
        query: "",
        allRoutes: true,
        limit: Number.POSITIVE_INFINITY,
    });
    strict_1.default.deepEqual(allRoutes.selected.map((entry) => entry.rubric.id).sort(), ["answer-guidance", "implementation-guidance"]);
});
(0, node_test_1.default)("selectRubrics can filter by domain", () => {
    const root = tempDir();
    writeRubric(root, "answer-workflow.yaml", `
id: answer-workflow
title: Answer workflow
description: Workflow guidance can apply to answers.
domain: coding_workflow
applies_to: [answer]
severity: must
`);
    writeRubric(root, "answer-communication.yaml", `
id: answer-communication
title: Answer communication
description: Answer runs should prefer communication rubrics.
domain: communication
applies_to: [answer]
severity: should
`);
    const { selected, errors } = (0, rubrics_js_1.selectRubrics)({
        rootDir: root,
        route: "answer",
        query: "",
        domains: ["communication"],
    });
    strict_1.default.deepEqual(errors, []);
    strict_1.default.deepEqual(selected.map((entry) => entry.rubric.id), ["answer-communication"]);
});
(0, node_test_1.default)("rubrics select CLI can render valid rubrics in best-effort mode", () => {
    const root = tempDir();
    writeRubric(root, "valid.yaml", `
id: valid-rubric
title: Valid rubric
description: Valid rubrics should still be selected.
applies_to: [implement]
`);
    writeRubric(root, "invalid.yaml", `
id: invalid-rubric
title: Invalid rubric
description: Invalid rubrics should warn without blocking best-effort reads.
applies_to: [implement]
weight: 99
`);
    const outputFile = (0, node_path_1.join)(root, "selected.md");
    const exitCode = withoutGithubOutput(() => (0, select_js_1.runRubricsSelectCli)([
        "--dir", root,
        "--route", "implement",
        "--query", "valid",
        "--best-effort",
        "--output-file", outputFile,
    ], { GITHUB_OUTPUT: "" }));
    strict_1.default.equal(exitCode, 0);
    strict_1.default.match((0, node_fs_1.readFileSync)(outputFile, "utf8"), /valid-rubric/);
});
(0, node_test_1.default)("rubrics select CLI filters answer rubrics by requested domains", () => {
    const root = tempDir();
    writeRubric(root, "workflow.yaml", `
id: workflow-answer
title: Workflow answer
description: Workflow answer guidance.
domain: coding_workflow
applies_to: [answer]
`);
    writeRubric(root, "communication.yaml", `
id: communication-answer
title: Communication answer
description: Communication answer guidance.
domain: communication
applies_to: [answer]
`);
    const outputFile = (0, node_path_1.join)(root, "selected-answer.md");
    const exitCode = withoutGithubOutput(() => (0, select_js_1.runRubricsSelectCli)([
        "--dir", root,
        "--route", "answer",
        "--domains", "communication",
        "--output-file", outputFile,
    ], { GITHUB_OUTPUT: "" }));
    const rendered = (0, node_fs_1.readFileSync)(outputFile, "utf8");
    strict_1.default.equal(exitCode, 0);
    strict_1.default.match(rendered, /communication-answer/);
    strict_1.default.doesNotMatch(rendered, /workflow-answer/);
});
(0, node_test_1.default)("formatRubricsForPrompt renders selected rubrics as markdown", () => {
    const root = tempDir();
    writeRubric(root, "regression.yaml", `
id: add-regression-tests
title: Add regression tests
description: Include regression tests for bug fixes.
applies_to: [implement]
severity: must
weight: 5
`);
    const { selected } = (0, rubrics_js_1.selectRubrics)({ rootDir: root, route: "implement", query: "regression" });
    const markdown = (0, rubrics_js_1.formatRubricsForPrompt)(selected);
    strict_1.default.match(markdown, /### Add regression tests/);
    strict_1.default.match(markdown, /`add-regression-tests`/);
});
(0, node_test_1.default)("tokenizeRubricQuery drops short non-numeric tokens", () => {
    strict_1.default.deepEqual((0, rubrics_js_1.tokenizeRubricQuery)("a PR 51 regression"), ["51", "regression"]);
});
(0, node_test_1.default)("rubrics policy defaults to read-only and supports route overrides", () => {
    const empty = (0, rubrics_policy_js_1.parseRubricsPolicy)("");
    strict_1.default.equal((0, rubrics_policy_js_1.getRubricsModeForRoute)(empty, "implement"), "read-only");
    strict_1.default.equal((0, rubrics_policy_js_1.rubricsModeAllowsRead)("read-only"), true);
    strict_1.default.equal((0, rubrics_policy_js_1.rubricsModeAllowsWrite)("read-only"), false);
    const policy = (0, rubrics_policy_js_1.parseRubricsPolicy)(JSON.stringify({
        default_mode: "disabled",
        route_overrides: { "rubrics-update": "enabled" },
    }));
    strict_1.default.equal((0, rubrics_policy_js_1.getRubricsModeForRoute)(policy, "answer"), "disabled");
    strict_1.default.equal((0, rubrics_policy_js_1.getRubricsModeForRoute)(policy, "rubrics-update"), "enabled");
    const dispatchPolicy = (0, rubrics_policy_js_1.parseRubricsPolicy)(JSON.stringify({
        default_mode: "enabled",
        route_overrides: { dispatch: "enabled" },
    }));
    strict_1.default.deepEqual(rubrics_policy_js_1.RUBRICS_HARD_DISABLED_ROUTES, ["dispatch"]);
    strict_1.default.equal((0, rubrics_policy_js_1.isRubricsHardDisabledRoute)("DISPATCH"), true);
    strict_1.default.equal((0, rubrics_policy_js_1.getRubricsModeForRoute)(dispatchPolicy, "dispatch"), "disabled");
});
(0, node_test_1.default)("rubrics mode hard-disables dispatch triage", () => {
    strict_1.default.equal((0, resolve_policy_js_1.resolveRubricsMode)({ ROUTE: "dispatch" }), "disabled");
    strict_1.default.equal((0, resolve_policy_js_1.resolveRubricsMode)({
        ROUTE: "dispatch",
        RUBRICS_MODE_OVERRIDE: "enabled",
        AGENT_RUBRICS_POLICY: JSON.stringify({ default_mode: "enabled" }),
    }), "disabled");
});
//# sourceMappingURL=rubrics.test.js.map