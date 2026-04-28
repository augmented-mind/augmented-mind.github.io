"use strict";
// CLI: compute cheap preflight outputs for agent-orchestrator.yml.
// Env: AUTOMATION_MODE, AUTOMATION_CURRENT_ROUND, AUTOMATION_MAX_ROUNDS
// Outputs: automation_mode, current_round, max_rounds, planner_enabled
Object.defineProperty(exports, "__esModule", { value: true });
const handoff_js_1 = require("../handoff.js");
const output_js_1 = require("../output.js");
function positiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
const automationMode = (0, handoff_js_1.normalizeAutomationMode)(process.env.AUTOMATION_MODE || "disabled");
const currentRound = positiveInt(process.env.AUTOMATION_CURRENT_ROUND || "", 1);
const maxRounds = positiveInt(process.env.AUTOMATION_MAX_ROUNDS || "", 5);
const plannerEnabled = automationMode === "agent" && currentRound < maxRounds;
(0, output_js_1.setOutput)("automation_mode", automationMode);
(0, output_js_1.setOutput)("current_round", String(currentRound));
(0, output_js_1.setOutput)("max_rounds", String(maxRounds));
(0, output_js_1.setOutput)("planner_enabled", String(plannerEnabled));
console.log(`Orchestrator preflight: mode=${automationMode}, round=${currentRound}/${maxRounds}, planner_enabled=${plannerEnabled}`);
//# sourceMappingURL=orchestrator-preflight.js.map