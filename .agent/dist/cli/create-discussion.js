#!/usr/bin/env node
"use strict";
// CLI: create a GitHub Discussion from a markdown body file.
// Env: GITHUB_REPOSITORY, DISCUSSION_CATEGORY, DISCUSSION_TITLE, BODY_FILE,
//      DISCUSSION_FOOTER (optional)
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const discussion_js_1 = require("../discussion.js");
const output_js_1 = require("../output.js");
function requiredEnv(name) {
    const value = process.env[name]?.trim() || "";
    if (!value)
        throw new Error(`${name} is required`);
    return value;
}
function parseRepoSlug(slug) {
    const [owner, repo, extra] = slug.split("/");
    if (!owner || !repo || extra) {
        throw new Error(`GITHUB_REPOSITORY must be owner/repo (got: ${slug || "missing"})`);
    }
    return { owner, repo };
}
function main() {
    try {
        const { owner, repo } = parseRepoSlug(requiredEnv("GITHUB_REPOSITORY"));
        const category = requiredEnv("DISCUSSION_CATEGORY");
        const title = requiredEnv("DISCUSSION_TITLE");
        const bodyFile = requiredEnv("BODY_FILE");
        const footer = process.env.DISCUSSION_FOOTER?.trim() || "";
        if (!(0, node_fs_1.existsSync)(bodyFile)) {
            throw new Error(`Discussion body file was not produced: ${bodyFile}`);
        }
        const body = (0, node_fs_1.readFileSync)(bodyFile, "utf8").trim();
        if (!body) {
            throw new Error("Discussion body is empty");
        }
        const discussion = (0, discussion_js_1.createRepositoryDiscussion)(owner, repo, category, title, footer ? `${body}\n\n---\n${footer}` : body);
        (0, output_js_1.setOutput)("discussion_url", discussion.url);
        console.log(`Discussion created: ${discussion.url}`);
        return 0;
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        return 1;
    }
}
process.exitCode = main();
//# sourceMappingURL=create-discussion.js.map