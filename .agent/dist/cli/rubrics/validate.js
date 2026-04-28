#!/usr/bin/env node
"use strict";
// CLI: validate rubric YAML files.
// Usage: node .agent/dist/cli/rubrics/validate.js --dir <dir>
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRubricsValidateCli = runRubricsValidateCli;
const node_util_1 = require("node:util");
const node_path_1 = require("node:path");
const rubrics_js_1 = require("../../rubrics.js");
const output_js_1 = require("../../output.js");
const ARG_CONFIG = {
    options: {
        dir: { type: "string" },
    },
    allowPositionals: false,
    strict: true,
};
function runRubricsValidateCli(argv, env = process.env) {
    let values;
    try {
        values = (0, node_util_1.parseArgs)({ ...ARG_CONFIG, args: argv }).values;
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 1;
    }
    const dir = (0, node_path_1.resolve)(values.dir || env.RUBRICS_DIR || process.cwd());
    const { rubrics, errors } = (0, rubrics_js_1.loadRubrics)(dir);
    (0, output_js_1.setOutput)("rubric_count", String(rubrics.length));
    (0, output_js_1.setOutput)("rubric_error_count", String(errors.length));
    if (errors.length > 0) {
        for (const error of errors) {
            console.error(`${error.path}: ${error.message}`);
        }
        return 1;
    }
    console.log(`validated ${rubrics.length} rubric${rubrics.length === 1 ? "" : "s"} in ${dir}`);
    return 0;
}
if (require.main === module) {
    process.exitCode = runRubricsValidateCli(process.argv.slice(2));
}
//# sourceMappingURL=validate.js.map