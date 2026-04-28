"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ghGraphqlData = ghGraphqlData;
exports.createGhGraphqlClient = createGhGraphqlClient;
const node_child_process_1 = require("node:child_process");
const DEFAULT_MAX_BUFFER = 16 * 1024 * 1024;
/**
 * Calls `gh api graphql` and returns the decoded `data` payload.
 */
function ghGraphqlData(query, variables, options = {}) {
    const args = ["api", "graphql", "-f", `query=${query}`];
    for (const [key, value] of Object.entries(variables)) {
        if (typeof value === "number" || typeof value === "boolean") {
            args.push("-F", `${key}=${value}`);
        }
        else if (value != null) {
            args.push("-f", `${key}=${value}`);
        }
    }
    const stdout = (0, node_child_process_1.execFileSync)("gh", args, {
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER,
    }).toString("utf8");
    const payload = JSON.parse(stdout);
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        const messages = payload.errors
            .map((error) => error?.message || JSON.stringify(error))
            .join("; ");
        throw new Error(`gh api graphql returned errors: ${messages}`);
    }
    if (payload.data === undefined) {
        throw new Error("gh api graphql returned no data");
    }
    return payload.data;
}
function createGhGraphqlClient(options = {}) {
    return {
        graphql(query, variables) {
            return ghGraphqlData(query, variables, options);
        },
    };
}
//# sourceMappingURL=github-graphql.js.map