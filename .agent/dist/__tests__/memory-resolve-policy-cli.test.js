"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const resolve_policy_js_1 = require("../cli/memory/resolve-policy.js");
(0, node_test_1.test)("resolveMode falls closed to 'disabled' on malformed AGENT_MEMORY_POLICY without mutating exitCode", () => {
    const originalPolicy = process.env.AGENT_MEMORY_POLICY;
    const originalRoute = process.env.ROUTE;
    const originalError = console.error;
    const originalExitCode = process.exitCode;
    process.env.AGENT_MEMORY_POLICY = '{"default_mode": "banana"}';
    process.env.ROUTE = "answer";
    console.error = () => { };
    try {
        node_assert_1.strict.equal((0, resolve_policy_js_1.resolveMode)(), "disabled");
        node_assert_1.strict.equal(process.exitCode, originalExitCode);
    }
    finally {
        process.env.AGENT_MEMORY_POLICY = originalPolicy;
        process.env.ROUTE = originalRoute;
        console.error = originalError;
    }
});
//# sourceMappingURL=memory-resolve-policy-cli.test.js.map