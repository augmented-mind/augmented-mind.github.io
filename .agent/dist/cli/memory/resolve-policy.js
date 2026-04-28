#!/usr/bin/env node
"use strict";
// CLI: resolve the memory mode for the current run-agent-task invocation.
//
// Env:
//   ROUTE                  current route (e.g., answer, review)
//   AGENT_MEMORY_POLICY    raw JSON policy string (optional, falls back to default-enabled)
//   MEMORY_MODE_OVERRIDE   explicit mode ("enabled" | "read-only" | "disabled"),
//                          bypasses the policy entirely (used by dedicated memory
//                          workflows so they always have memory on)
//
// Outputs:
//   mode                   resolved mode string
//   read_enabled           "true" | "false"
//   write_enabled          "true" | "false"
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMode = resolveMode;
const output_js_1 = require("../../output.js");
const memory_policy_js_1 = require("../../memory-policy.js");
function resolveMode() {
    const override = String(process.env.MEMORY_MODE_OVERRIDE || "").trim().toLowerCase();
    if (override) {
        if (!(0, memory_policy_js_1.isMemoryMode)(override)) {
            console.error(`Invalid MEMORY_MODE_OVERRIDE: ${override}. Expected enabled, read-only, or disabled.`);
            process.exitCode = 2;
            return memory_policy_js_1.DEFAULT_MEMORY_MODE;
        }
        return override;
    }
    const route = String(process.env.ROUTE || "").trim().toLowerCase();
    try {
        const policy = (0, memory_policy_js_1.parseMemoryPolicy)(process.env.AGENT_MEMORY_POLICY || "");
        return (0, memory_policy_js_1.getMemoryModeForRoute)(policy, route);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Invalid AGENT_MEMORY_POLICY: ${msg}. Falling back to disabled.`);
        // Fall closed on a bad policy: disable memory for this run so a typo in
        // the repo variable does not take down user-triggered routes.
        return "disabled";
    }
}
if (require.main === module) {
    const mode = resolveMode();
    (0, output_js_1.setOutput)("mode", mode);
    (0, output_js_1.setOutput)("read_enabled", (0, memory_policy_js_1.memoryModeAllowsRead)(mode) ? "true" : "false");
    (0, output_js_1.setOutput)("write_enabled", (0, memory_policy_js_1.memoryModeAllowsWrite)(mode) ? "true" : "false");
    process.stdout.write(`memory mode: ${mode}\n`);
}
//# sourceMappingURL=resolve-policy.js.map