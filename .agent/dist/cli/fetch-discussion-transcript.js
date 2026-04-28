#!/usr/bin/env node
"use strict";
// CLI: fetch a discussion transcript via GitHub GraphQL.
// Usage: node .agent/dist/cli/fetch-discussion-transcript.js <discussion-number>
// Env: REPO_SLUG (optional, falls back to `gh repo view`)
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRepoSlug = resolveRepoSlug;
exports.parseDiscussionNumber = parseDiscussionNumber;
exports.runFetchDiscussionTranscriptCli = runFetchDiscussionTranscriptCli;
const node_child_process_1 = require("node:child_process");
const discussion_transcript_js_1 = require("../discussion-transcript.js");
const github_graphql_js_1 = require("../github-graphql.js");
const MAX_BUFFER = 16 * 1024 * 1024;
const USAGE = "Usage: fetch-discussion-transcript.js <discussion-number>\n";
const REPO_ERROR = "Could not determine repository. Set REPO_SLUG or run from a git checkout.\n";
/**
 * Resolves the current repository slug from the environment or `gh repo view`.
 */
function resolveRepoSlug(options = {}) {
    const env = options.env || process.env;
    const execGh = options.execGh || node_child_process_1.execFileSync;
    const repoSlug = env.REPO_SLUG || "";
    if (repoSlug) {
        return repoSlug;
    }
    return execGh("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], {
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: MAX_BUFFER,
    })
        .toString("utf8")
        .trim();
}
/**
 * Parses the discussion number argument.
 */
function parseDiscussionNumber(value) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        return null;
    }
    return number;
}
function runFetchDiscussionTranscriptCli(argv, options = {}) {
    const env = options.env || process.env;
    const stdout = options.stdout || process.stdout;
    const stderr = options.stderr || process.stderr;
    const number = parseDiscussionNumber(argv[0]);
    if (!number) {
        stderr.write(USAGE);
        return 1;
    }
    const resolveRepo = options.resolveRepoSlug || resolveRepoSlug;
    const repoSlug = resolveRepo({ env });
    const [owner, repo] = repoSlug.split("/", 2);
    if (!owner || !repo) {
        stderr.write(REPO_ERROR);
        return 1;
    }
    const createClient = options.createClient || github_graphql_js_1.createGhGraphqlClient;
    const fetchTranscript = options.fetchDiscussionTranscript || discussion_transcript_js_1.fetchDiscussionTranscript;
    const renderTranscript = options.buildDiscussionTranscript || discussion_transcript_js_1.buildDiscussionTranscript;
    try {
        const { discussionMeta, comments } = fetchTranscript(createClient(), owner, repo, number);
        stdout.write(renderTranscript(discussionMeta, comments));
        return 0;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stderr.write(`${message}\n`);
        return 1;
    }
}
if (require.main === module) {
    process.exitCode = runFetchDiscussionTranscriptCli(process.argv.slice(2));
}
//# sourceMappingURL=fetch-discussion-transcript.js.map