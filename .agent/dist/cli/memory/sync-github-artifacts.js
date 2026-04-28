#!/usr/bin/env node
"use strict";
// CLI: mirror issues / pull requests / discussions into the memory
// branch's github/ subtree as raw `gh --json` output. No LLM, no custom
// formatting — the agent grep-searches / jq-queries the JSON dumps directly.
//
// Emits cursors as step outputs so the outer workflow can persist them via
// write-sync-state.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGhApiPagedArgs = buildGhApiPagedArgs;
exports.hasDiscussionsEnabled = hasDiscussionsEnabled;
exports.fetchDiscussions = fetchDiscussions;
exports.fetchDiscussionDetail = fetchDiscussionDetail;
exports.runSyncGithubArtifactsCli = runSyncGithubArtifactsCli;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const node_path_1 = require("node:path");
const github_graphql_js_1 = require("../../github-graphql.js");
const memory_artifacts_js_1 = require("../../memory-artifacts.js");
const output_js_1 = require("../../output.js");
const MAX_BUFFER = 32 * 1024 * 1024;
const DEFAULT_LOOKBACK_DAYS = 30;
// Fields requested from `gh issue view` / `gh pr view`. We persist whatever
// gh gives us back verbatim.
const ISSUE_FIELDS = [
    "number", "title", "body", "url", "state", "author", "labels",
    "createdAt", "updatedAt", "closedAt", "comments",
].join(",");
const PR_FIELDS = [
    "number", "title", "body", "url", "state", "author", "labels",
    "createdAt", "updatedAt", "closedAt", "mergedAt", "reviewDecision",
    "headRefName", "baseRefName", "comments", "reviews", "files",
].join(",");
const ARG_CONFIG = {
    options: {
        dir: { type: "string" },
        repo: { type: "string" },
        since: { type: "string" },
        "started-at": { type: "string" },
        "lookback-days": { type: "string" },
    },
    allowPositionals: false,
    strict: true,
};
function parsePositiveInt(value, fallback) {
    const parsed = Number(value ?? "");
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function parseCliArgs(argv, env) {
    const { values } = (0, node_util_1.parseArgs)({ ...ARG_CONFIG, args: argv });
    const dir = values.dir || env.MEMORY_DIR || process.cwd();
    const repo = values.repo || env.REPO_SLUG || env.GITHUB_REPOSITORY || "";
    const startedAt = values["started-at"] || env.MEMORY_SYNC_STARTED_AT || new Date().toISOString();
    const lookbackDays = parsePositiveInt(values["lookback-days"] || env.MEMORY_SYNC_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS);
    const explicitSince = values.since || env.MEMORY_SYNC_SINCE || "";
    const since = explicitSince || isoDaysAgo(startedAt, lookbackDays);
    return { dir: (0, node_path_1.resolve)(dir), repo, since, startedAt, lookbackDays };
}
function isoDaysAgo(fromIso, days) {
    return new Date(new Date(fromIso).getTime() - days * 86_400_000).toISOString();
}
function maxIso(a, b) {
    if (!b)
        return a;
    return a >= b ? a : b;
}
function ghJson(args) {
    return JSON.parse((0, node_child_process_1.execFileSync)("gh", args, {
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: MAX_BUFFER,
    }).toString("utf8"));
}
function buildGhApiPagedArgs(endpoint, params) {
    const args = ["api", "--method", "GET", "--paginate", "--slurp", endpoint];
    for (const [flag, value] of params)
        args.push(flag, value);
    return args;
}
function ghApiPaged(endpoint, params) {
    const args = buildGhApiPagedArgs(endpoint, params);
    return ghJson(args).flat();
}
function writeArtifact(path, data) {
    return (0, memory_artifacts_js_1.writeFileIfChanged)(path, JSON.stringify(data, null, 2) + "\n");
}
function hasDiscussionsEnabled(client, owner, repo) {
    const data = client.graphql(`query($owner:String!,$repo:String!){
      repository(owner:$owner,name:$repo){
        hasDiscussionsEnabled
      }
    }`, { owner, repo });
    return data.repository?.hasDiscussionsEnabled === true;
}
function fetchDiscussions(client, owner, repo, since) {
    if (!hasDiscussionsEnabled(client, owner, repo)) {
        return [];
    }
    const out = [];
    let after;
    while (true) {
        const page = client.graphql(`query($owner:String!,$repo:String!,$after:String){
        repository(owner:$owner,name:$repo){
          discussions(first:100, after:$after, orderBy:{field:UPDATED_AT,direction:DESC}){
            nodes { number updatedAt }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`, { owner, repo, after });
        const nodes = page.repository?.discussions?.nodes ?? [];
        let reachedOlder = false;
        for (const node of nodes) {
            if (since && node.updatedAt && node.updatedAt <= since) {
                reachedOlder = true;
                break;
            }
            out.push(node);
        }
        if (reachedOlder)
            break;
        const info = page.repository?.discussions?.pageInfo;
        if (!info?.hasNextPage)
            break;
        after = info.endCursor || undefined;
    }
    return out;
}
function fetchPaginatedDiscussionDetail(client, owner, repo, number) {
    let detail = null;
    const comments = [];
    let after;
    let hasNextPage = true;
    while (hasNextPage) {
        const data = client.graphql(`query($owner:String!,$repo:String!,$n:Int!,$after:String){
        repository(owner:$owner,name:$repo){
          discussion(number:$n){
            number title url body createdAt updatedAt
            author { login }
            category { name }
            comments(first:100, after:$after) {
              nodes {
                id body createdAt url
                author { login }
                replies(first:100) {
                  nodes {
                    id body createdAt url
                    author { login }
                    replyTo { id }
                  }
                  pageInfo { hasNextPage endCursor }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }`, { owner, repo, n: number, after });
        const discussion = data.repository?.discussion;
        if (!discussion)
            return null;
        if (!detail) {
            detail = {
                number: discussion.number ?? number,
                title: discussion.title || "",
                url: discussion.url || "",
                body: discussion.body || "",
                createdAt: discussion.createdAt || "",
                updatedAt: discussion.updatedAt || "",
                author: discussion.author?.login ? { login: discussion.author.login } : null,
                category: discussion.category?.name ? { name: discussion.category.name } : null,
                comments: {
                    nodes: comments,
                    pageInfo: { hasNextPage: false, endCursor: null },
                },
            };
        }
        for (const rawComment of discussion.comments?.nodes || []) {
            const replies = (rawComment.replies?.nodes || []).map((reply) => ({
                id: reply.id,
                body: reply.body || "",
                createdAt: reply.createdAt || "",
                url: reply.url || "",
                author: reply.author?.login ? { login: reply.author.login } : null,
                replyTo: reply.replyTo?.id ? { id: reply.replyTo.id } : null,
            }));
            let replyAfter = rawComment.replies?.pageInfo?.endCursor || undefined;
            let replyHasNextPage = rawComment.replies?.pageInfo?.hasNextPage || false;
            while (replyHasNextPage) {
                const replyPage = client.graphql(`query($commentId:ID!,$after:String){
            node(id:$commentId){
              ... on DiscussionComment {
                replies(first:100, after:$after) {
                  nodes {
                    id body createdAt url
                    author { login }
                    replyTo { id }
                  }
                  pageInfo { hasNextPage endCursor }
                }
              }
            }
          }`, { commentId: rawComment.id, after: replyAfter });
                const moreReplies = replyPage.node?.replies;
                if (!moreReplies)
                    break;
                replies.push(...(moreReplies.nodes || []).map((reply) => ({
                    id: reply.id,
                    body: reply.body || "",
                    createdAt: reply.createdAt || "",
                    url: reply.url || "",
                    author: reply.author?.login ? { login: reply.author.login } : null,
                    replyTo: reply.replyTo?.id ? { id: reply.replyTo.id } : null,
                })));
                replyAfter = moreReplies.pageInfo?.endCursor || undefined;
                replyHasNextPage = moreReplies.pageInfo?.hasNextPage || false;
            }
            comments.push({
                id: rawComment.id,
                body: rawComment.body || "",
                createdAt: rawComment.createdAt || "",
                url: rawComment.url || "",
                author: rawComment.author?.login ? { login: rawComment.author.login } : null,
                replies: {
                    nodes: replies,
                    pageInfo: { hasNextPage: false, endCursor: null },
                },
            });
        }
        after = discussion.comments?.pageInfo?.endCursor || undefined;
        hasNextPage = discussion.comments?.pageInfo?.hasNextPage || false;
    }
    return detail;
}
function fetchDiscussionDetail(client, owner, repo, number) {
    return fetchPaginatedDiscussionDetail(client, owner, repo, number);
}
function runSyncGithubArtifactsCli(argv, options = {}) {
    const env = options.env || process.env;
    const stdout = options.stdout || process.stdout;
    const stderr = options.stderr || process.stderr;
    let args;
    try {
        args = parseCliArgs(argv, env);
    }
    catch (error) {
        stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        return 1;
    }
    if (!args.repo || !args.repo.includes("/")) {
        stderr.write(`Missing or invalid repository slug (got: ${args.repo || "empty"}). Set REPO_SLUG or GITHUB_REPOSITORY.\n`);
        return 1;
    }
    const [owner, repoName] = args.repo.split("/", 2);
    try {
        (0, memory_artifacts_js_1.ensureMemoryStructure)(args.dir, args.repo);
        // Issues + PRs come from one REST endpoint; the `pull_request` marker
        // distinguishes them.
        const issueLike = ghApiPaged(`repos/${args.repo}/issues`, [
            ["-f", "state=all"],
            ["-f", `since=${args.since}`],
            ["-f", "sort=updated"],
            ["-f", "direction=asc"],
            ["-F", "per_page=100"],
        ]);
        const issueItems = issueLike.filter((i) => !i.pull_request);
        const pullItems = issueLike.filter((i) => Boolean(i.pull_request));
        let changed = 0;
        let issueCursor = args.startedAt;
        let pullCursor = args.startedAt;
        let lastActivityAt = "";
        for (const item of issueItems) {
            const data = ghJson([
                "issue", "view", String(item.number), "--repo", args.repo, "--json", ISSUE_FIELDS,
            ]);
            if (writeArtifact((0, memory_artifacts_js_1.issueArtifactPath)(args.dir, item.number), data))
                changed += 1;
            issueCursor = maxIso(issueCursor, item.updated_at || data.updatedAt);
            lastActivityAt = maxIso(lastActivityAt, item.updated_at || data.updatedAt);
        }
        for (const item of pullItems) {
            const data = ghJson([
                "pr", "view", String(item.number), "--repo", args.repo, "--json", PR_FIELDS,
            ]);
            if (writeArtifact((0, memory_artifacts_js_1.pullRequestArtifactPath)(args.dir, item.number), data))
                changed += 1;
            pullCursor = maxIso(pullCursor, item.updated_at || data.updatedAt);
            lastActivityAt = maxIso(lastActivityAt, item.updated_at || data.updatedAt);
        }
        // Discussions: no `gh discussion` subcommand (cli/cli#3164) — use GraphQL.
        const client = options.graphqlClient || (0, github_graphql_js_1.createGhGraphqlClient)();
        const discussionNodes = fetchDiscussions(client, owner, repoName, args.since);
        let discussionCursor = args.startedAt;
        for (const node of discussionNodes) {
            const detail = fetchDiscussionDetail(client, owner, repoName, node.number);
            if (writeArtifact((0, memory_artifacts_js_1.discussionArtifactPath)(args.dir, node.number), detail))
                changed += 1;
            discussionCursor = maxIso(discussionCursor, node.updatedAt);
            lastActivityAt = maxIso(lastActivityAt, node.updatedAt);
        }
        // Compatibility-only: commit artifacts are no longer mirrored, but the
        // workflows still pass these outputs into the sync-state writer.
        const commitCursor = args.startedAt;
        (0, output_js_1.setOutput)("effective_since", args.since);
        (0, output_js_1.setOutput)("issue_count", String(issueItems.length));
        (0, output_js_1.setOutput)("pull_count", String(pullItems.length));
        (0, output_js_1.setOutput)("discussion_count", String(discussionNodes.length));
        (0, output_js_1.setOutput)("commit_count", "0");
        (0, output_js_1.setOutput)("changed_files", String(changed));
        (0, output_js_1.setOutput)("last_activity_at", lastActivityAt);
        (0, output_js_1.setOutput)("issue_cursor", issueCursor);
        (0, output_js_1.setOutput)("pull_cursor", pullCursor);
        (0, output_js_1.setOutput)("discussion_cursor", discussionCursor);
        (0, output_js_1.setOutput)("commit_cursor", commitCursor);
        stdout.write(`${JSON.stringify({
            repo: args.repo,
            memoryDir: args.dir,
            effectiveSince: args.since,
            issueCount: issueItems.length,
            pullCount: pullItems.length,
            discussionCount: discussionNodes.length,
            commitCount: 0,
            changedFiles: changed,
            cursors: {
                issues: issueCursor,
                pulls: pullCursor,
                discussions: discussionCursor,
                commits: commitCursor,
            },
        }, null, 2)}\n`);
        return 0;
    }
    catch (error) {
        stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        return 1;
    }
}
if (require.main === module) {
    process.exitCode = runSyncGithubArtifactsCli(process.argv.slice(2));
}
//# sourceMappingURL=sync-github-artifacts.js.map