#!/usr/bin/env node
"use strict";
// CLI: resolve effective rubric access mode for a route.
// Env: AGENT_RUBRICS_POLICY, RUBRICS_MODE_OVERRIDE, ROUTE
// Outputs: mode, read_enabled, write_enabled
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRubricsMode = resolveRubricsMode;
exports.runRubricsResolvePolicyCli = runRubricsResolvePolicyCli;
const output_js_1 = require("../../output.js");
const rubrics_policy_js_1 = require("../../rubrics-policy.js");
function resolveRubricsMode(env = process.env) {
    const route = String(env.ROUTE || "").trim().toLowerCase();
    if ((0, rubrics_policy_js_1.isRubricsHardDisabledRoute)(route)) {
        return "disabled";
    }
    const override = String(env.RUBRICS_MODE_OVERRIDE || "").trim().toLowerCase();
    if (override) {
        if (!(0, rubrics_policy_js_1.isRubricsMode)(override)) {
            throw new Error(`RUBRICS_MODE_OVERRIDE must be one of enabled, read-only, disabled (got ${override})`);
        }
        return override;
    }
    const policy = (0, rubrics_policy_js_1.parseRubricsPolicy)(env.AGENT_RUBRICS_POLICY || "");
    return (0, rubrics_policy_js_1.getRubricsModeForRoute)(policy, route);
}
function runRubricsResolvePolicyCli(env = process.env) {
    try {
        const mode = resolveRubricsMode(env);
        (0, output_js_1.setOutput)("mode", mode);
        (0, output_js_1.setOutput)("read_enabled", String((0, rubrics_policy_js_1.rubricsModeAllowsRead)(mode)));
        (0, output_js_1.setOutput)("write_enabled", String((0, rubrics_policy_js_1.rubricsModeAllowsWrite)(mode)));
        console.log(`rubrics mode: ${mode}`);
        return 0;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Invalid AGENT_RUBRICS_POLICY: ${msg}`);
        // Fail closed: malformed policy disables rubric access for this run, but the
        // workflow can continue without rubric steering.
        (0, output_js_1.setOutput)("mode", "disabled");
        (0, output_js_1.setOutput)("read_enabled", "false");
        (0, output_js_1.setOutput)("write_enabled", "false");
        return 0;
    }
}
if (require.main === module) {
    process.exitCode = runRubricsResolvePolicyCli();
}
//# sourceMappingURL=resolve-policy.js.map