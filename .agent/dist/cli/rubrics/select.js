#!/usr/bin/env node
"use strict";
// CLI: select route-applicable rubrics and render them as markdown.
// Usage: node .agent/dist/cli/rubrics/select.js --dir <dir> --route implement --query "..."
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRubricsSelectCli = runRubricsSelectCli;
const node_fs_1 = require("node:fs");
const node_util_1 = require("node:util");
const node_path_1 = require("node:path");
const rubrics_js_1 = require("../../rubrics.js");
const output_js_1 = require("../../output.js");
const ARG_CONFIG = {
    options: {
        dir: { type: "string" },
        route: { type: "string" },
        query: { type: "string" },
        limit: { type: "string" },
        domains: { type: "string" },
        "include-draft": { type: "boolean" },
        "all-routes": { type: "boolean" },
        "best-effort": { type: "boolean" },
        "output-file": { type: "string" },
    },
    allowPositionals: true,
    strict: true,
};
function parseLimit(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "all")
        return Number.POSITIVE_INFINITY;
    const n = Number(value || "");
    return Number.isInteger(n) && n > 0 ? n : undefined;
}
function parseDomains(value) {
    const valid = new Set(rubrics_js_1.RUBRIC_DOMAINS);
    const seen = new Set();
    const domains = [];
    for (const entry of String(value || "").split(",")) {
        const domain = entry.trim().toLowerCase();
        if (!domain)
            continue;
        if (!valid.has(domain)) {
            throw new Error(`--domains entries must be one of ${rubrics_js_1.RUBRIC_DOMAINS.join(", ")}`);
        }
        if (!seen.has(domain)) {
            seen.add(domain);
            domains.push(domain);
        }
    }
    return domains;
}
function runRubricsSelectCli(argv, env = process.env) {
    let parsed;
    try {
        parsed = (0, node_util_1.parseArgs)({ ...ARG_CONFIG, args: argv });
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 1;
    }
    const values = parsed.values;
    const dir = (0, node_path_1.resolve)(values.dir || env.RUBRICS_DIR || process.cwd());
    const route = values.route || env.ROUTE || "";
    const query = values.query || parsed.positionals.join(" ") || env.REQUEST_TEXT || "";
    const outputFile = values["output-file"] || env.RUBRICS_CONTEXT_FILE || "";
    let domains = [];
    try {
        domains = parseDomains(values.domains || env.RUBRICS_SELECT_DOMAINS);
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 1;
    }
    const { selected, errors } = (0, rubrics_js_1.selectRubrics)({
        rootDir: dir,
        route,
        query,
        limit: parseLimit(values.limit || env.RUBRICS_LIMIT),
        includeDraft: Boolean(values["include-draft"]),
        allRoutes: Boolean(values["all-routes"]),
        domains,
    });
    (0, output_js_1.setOutput)("selected_count", String(selected.length));
    (0, output_js_1.setOutput)("rubric_error_count", String(errors.length));
    if (errors.length > 0) {
        for (const error of errors) {
            console.error(`::warning file=${error.path},title=Invalid rubric::${error.message}`);
        }
        if (!values["best-effort"])
            return 1;
    }
    const rendered = (0, rubrics_js_1.formatRubricsForPrompt)(selected);
    if (outputFile) {
        (0, node_fs_1.writeFileSync)(outputFile, rendered, "utf8");
        (0, output_js_1.setOutput)("context_file", outputFile);
    }
    process.stdout.write(rendered);
    return 0;
}
if (require.main === module) {
    process.exitCode = runRubricsSelectCli(process.argv.slice(2));
}
//# sourceMappingURL=select.js.map