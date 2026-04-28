#!/usr/bin/env node
"use strict";
// CLI: initialize a local agent/memory branch inside the current git repo.
// Usage: node .agent/dist/cli/memory/bootstrap-branch.js [--repo <slug>] [--branch <name>] [--remote <name>]
// Env: REPO_SLUG, GITHUB_REPOSITORY
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitHubRepoSlugFromRemoteUrl = parseGitHubRepoSlugFromRemoteUrl;
exports.parseMemoryBootstrapBranchArgs = parseMemoryBootstrapBranchArgs;
exports.runMemoryBootstrapBranchCli = runMemoryBootstrapBranchCli;
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_util_1 = require("node:util");
const memory_artifacts_js_1 = require("../../memory-artifacts.js");
const git_js_1 = require("../../git.js");
const DEFAULT_BRANCH = "agent/memory";
const DEFAULT_REMOTE = "origin";
const USAGE = [
    "Usage: memory/bootstrap-branch.js [--repo <slug>] [--branch <name>] [--remote <name>]",
    "",
    "Options:",
    `  --repo <slug>      Repository slug used in seeded stubs (defaults to REPO_SLUG, GITHUB_REPOSITORY, or ${DEFAULT_REMOTE} remote URL)`,
    `  --branch <name>    Memory branch to create or update (default: ${DEFAULT_BRANCH})`,
    `  --remote <name>    Remote used for repo-slug inference and next-step hints (default: ${DEFAULT_REMOTE})`,
    "  -h, --help         Show this message",
    "",
    "This command creates or updates a local memory branch and seeds PROJECT.md / MEMORY.md",
    "without changing your current checkout. Push it separately when ready.",
    "",
].join("\n");
const ARG_CONFIG = {
    options: {
        repo: { type: "string" },
        branch: { type: "string" },
        remote: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
    strict: true,
};
function parseGitHubRepoSlugFromRemoteUrl(url) {
    const match = url.trim().match(/github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?$/i);
    return match?.[1] || "";
}
function hasLocalBranch(branch, repoRoot) {
    try {
        (0, git_js_1.git)(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], repoRoot);
        return true;
    }
    catch {
        return false;
    }
}
function hasRemoteTrackingBranch(branch, remote, repoRoot) {
    try {
        (0, git_js_1.git)(["show-ref", "--verify", "--quiet", `refs/remotes/${remote}/${branch}`], repoRoot);
        return true;
    }
    catch {
        return false;
    }
}
function currentBranch(repoRoot) {
    try {
        return (0, git_js_1.git)(["branch", "--show-current"], repoRoot);
    }
    catch {
        return "";
    }
}
function inferRepoSlug(repoRoot, remote) {
    try {
        return parseGitHubRepoSlugFromRemoteUrl((0, git_js_1.git)(["remote", "get-url", remote], repoRoot));
    }
    catch {
        return "";
    }
}
function parseMemoryBootstrapBranchArgs(argv, env = process.env, cwd = process.cwd()) {
    const { values } = (0, node_util_1.parseArgs)({ ...ARG_CONFIG, args: argv });
    const remote = values.remote || DEFAULT_REMOTE;
    const repoRoot = (0, git_js_1.git)(["rev-parse", "--show-toplevel"], cwd);
    return {
        repo: values.repo
            || env.REPO_SLUG
            || env.GITHUB_REPOSITORY
            || inferRepoSlug(repoRoot, remote),
        branch: values.branch || DEFAULT_BRANCH,
        remote,
        help: Boolean(values.help),
    };
}
function runMemoryBootstrapBranchCli(argv, options = {}) {
    const cwd = options.cwd || process.cwd();
    const env = options.env || process.env;
    const stdout = options.stdout || process.stdout;
    const stderr = options.stderr || process.stderr;
    let args;
    let repoRoot = "";
    try {
        repoRoot = (0, git_js_1.git)(["rev-parse", "--show-toplevel"], cwd);
        args = parseMemoryBootstrapBranchArgs(argv, env, cwd);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stderr.write(`${message}\n\n${USAGE}`);
        return 1;
    }
    if (args.help) {
        stdout.write(USAGE);
        return 0;
    }
    if (!args.repo || !args.repo.includes("/")) {
        stderr.write(`Missing or invalid repository slug (got: ${args.repo || "empty"}).\n`
            + `Pass --repo <owner/repo> or configure a GitHub origin remote.\n\n${USAGE}`);
        return 1;
    }
    const worktreeDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-memory-bootstrap-"));
    let addedWorktree = false;
    try {
        const branchExists = hasLocalBranch(args.branch, repoRoot);
        const remoteBranchExists = !branchExists && hasRemoteTrackingBranch(args.branch, args.remote, repoRoot);
        const checkedOutBranch = currentBranch(repoRoot);
        if (branchExists && checkedOutBranch === args.branch) {
            stderr.write(`Branch ${args.branch} is already checked out in the current worktree.\n`
                + "Switch to another branch before rerunning bootstrap.\n");
            return 1;
        }
        (0, git_js_1.git)(["worktree", "add", "--detach", worktreeDir, "HEAD"], repoRoot);
        addedWorktree = true;
        if (branchExists) {
            (0, git_js_1.git)(["checkout", args.branch], worktreeDir);
        }
        else if (remoteBranchExists) {
            (0, git_js_1.git)(["checkout", "-b", args.branch, `${args.remote}/${args.branch}`], worktreeDir);
        }
        else {
            (0, git_js_1.git)(["checkout", "--orphan", args.branch], worktreeDir);
            try {
                (0, git_js_1.git)(["rm", "-rf", "."], worktreeDir);
            }
            catch { /* ok */ }
            try {
                (0, git_js_1.git)(["clean", "-fdx"], worktreeDir);
            }
            catch { /* ok */ }
        }
        const initResult = (0, memory_artifacts_js_1.ensureMemoryStructure)(worktreeDir, args.repo);
        (0, git_js_1.configureBotIdentity)(worktreeDir);
        (0, git_js_1.stageAll)(worktreeDir);
        let committed = false;
        if ((0, git_js_1.hasStagedChanges)(worktreeDir)) {
            (0, git_js_1.commit)("chore(memory): initialize memory branch", worktreeDir);
            committed = true;
        }
        stdout.write(`${JSON.stringify({
            repoRoot,
            repo: args.repo,
            branch: args.branch,
            remote: args.remote,
            createdBranch: !branchExists,
            committed,
            createdFiles: initResult.createdFiles.map((file) => file.replace(`${worktreeDir}/`, "")),
            nextStep: `git push ${args.remote} ${args.branch}`,
        }, null, 2)}\n`);
        return 0;
    }
    catch (error) {
        stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        return 1;
    }
    finally {
        if (addedWorktree) {
            try {
                (0, git_js_1.git)(["worktree", "remove", "--force", worktreeDir], repoRoot);
            }
            catch { /* ok */ }
        }
        try {
            (0, node_fs_1.rmSync)(worktreeDir, { recursive: true, force: true });
        }
        catch { /* ok */ }
    }
}
if (require.main === module) {
    process.exitCode = runMemoryBootstrapBranchCli(process.argv.slice(2));
}
//# sourceMappingURL=bootstrap-branch.js.map