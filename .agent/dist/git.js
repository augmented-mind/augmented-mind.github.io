"use strict";
// Git helpers for workflow post-processing steps.
//
// These functions wrap the git CLI operations that workflows perform after
// the agent completes: branch management, committing, and pushing.
//
// The low-level `git()` runner and `buildAuthUrl()` are also used by
// thread-state-git.ts for ref-based state storage.
Object.defineProperty(exports, "__esModule", { value: true });
exports.git = git;
exports.buildAuthUrl = buildAuthUrl;
exports.configureBotIdentity = configureBotIdentity;
exports.createBranch = createBranch;
exports.hasChanges = hasChanges;
exports.currentHead = currentHead;
exports.hasHeadChanged = hasHeadChanged;
exports.hasStagedChanges = hasStagedChanges;
exports.stageAll = stageAll;
exports.commit = commit;
exports.pushBranch = pushBranch;
exports.buildPushToRefArgs = buildPushToRefArgs;
exports.pushToRef = pushToRef;
exports.cleanupBranch = cleanupBranch;
exports.cleanupWorktree = cleanupWorktree;
exports.commitAndPush = commitAndPush;
exports.pushHeadUpdate = pushHeadUpdate;
const node_child_process_1 = require("node:child_process");
const DEFAULT_BOT_NAME = "sepo-agent";
const DEFAULT_BOT_EMAIL = "279869237+sepo-agent@users.noreply.github.com";
const GIT_MAX_BUFFER = 10 * 1024 * 1024; // 10 MB
/** Excluded patterns for git add (secrets, private keys). */
const ADD_EXCLUDES = [":!.env*", ":!*.pem", ":!*.key"];
// ---------------------------------------------------------------------------
// Low-level primitives (shared across modules)
// ---------------------------------------------------------------------------
/**
 * Runs a git command synchronously and returns trimmed stdout.
 * Accepts optional stdin input for commands like `hash-object --stdin`
 * and `mktree`.
 */
function git(args, cwd, input) {
    return (0, node_child_process_1.execFileSync)("git", args, {
        cwd,
        input,
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: GIT_MAX_BUFFER,
    }).toString("utf8").trim();
}
/**
 * Builds an authenticated HTTPS remote URL for pushing.
 * Used by branch push helpers and thread-state ref pushes.
 */
function buildAuthUrl(token, repo) {
    return `https://x-access-token:${token}@github.com/${repo}.git`;
}
function configureBotIdentity(cwd, name, email) {
    const botName = name || process.env.GIT_BOT_NAME || DEFAULT_BOT_NAME;
    const botEmail = email || process.env.GIT_BOT_EMAIL || DEFAULT_BOT_EMAIL;
    (0, node_child_process_1.execFileSync)("git", ["config", "user.name", botName], { cwd, stdio: "pipe" });
    (0, node_child_process_1.execFileSync)("git", ["config", "user.email", botEmail], { cwd, stdio: "pipe" });
}
function createBranch(baseBranch, branchName, cwd) {
    (0, node_child_process_1.execFileSync)("git", ["checkout", "-b", branchName, baseBranch], { cwd, stdio: "pipe" });
}
function hasChanges(cwd) {
    const output = (0, node_child_process_1.execFileSync)("git", ["status", "--porcelain"], { cwd, stdio: "pipe" })
        .toString("utf8")
        .trim();
    return output.length > 0;
}
function currentHead(cwd) {
    return git(["rev-parse", "HEAD"], cwd);
}
function hasHeadChanged(originalHead, cwd) {
    return Boolean(originalHead) && currentHead(cwd) !== originalHead;
}
function hasStagedChanges(cwd) {
    try {
        (0, node_child_process_1.execFileSync)("git", ["diff", "--cached", "--quiet"], { cwd, stdio: "pipe" });
        return false;
    }
    catch {
        return true;
    }
}
function stageAll(cwd) {
    (0, node_child_process_1.execFileSync)("git", ["add", "-A", "--", ...ADD_EXCLUDES], { cwd, stdio: "pipe" });
}
function commit(message, cwd) {
    (0, node_child_process_1.execFileSync)("git", ["commit", "-m", message], { cwd, stdio: "pipe" });
}
function pushBranch(branch, token, repo, cwd, opts) {
    const url = buildAuthUrl(token, repo);
    const args = ["push"];
    if (opts?.setUpstream)
        args.push("-u");
    args.push(url, branch);
    (0, node_child_process_1.execFileSync)("git", args, { cwd, stdio: "pipe" });
}
function buildPushToRefArgs(remoteUrl, headRef, opts) {
    const args = ["push"];
    if (opts?.forceWithLeaseOid) {
        args.push(`--force-with-lease=refs/heads/${headRef}:${opts.forceWithLeaseOid}`);
    }
    args.push(remoteUrl, `HEAD:${headRef}`);
    return args;
}
function pushToRef(headRef, token, repo, cwd, opts) {
    const url = buildAuthUrl(token, repo);
    (0, node_child_process_1.execFileSync)("git", buildPushToRefArgs(url, headRef, opts), { cwd, stdio: "pipe" });
}
function cleanupBranch(branchName, baseBranch, cwd) {
    try {
        (0, node_child_process_1.execFileSync)("git", ["checkout", "-f", baseBranch], { cwd, stdio: "pipe" });
    }
    catch { /* ok */ }
    try {
        (0, node_child_process_1.execFileSync)("git", ["branch", "-D", branchName], { cwd, stdio: "pipe" });
    }
    catch { /* ok */ }
    try {
        (0, node_child_process_1.execFileSync)("git", ["reset", "--hard", "HEAD"], { cwd, stdio: "pipe" });
    }
    catch { /* ok */ }
    try {
        (0, node_child_process_1.execFileSync)("git", ["clean", "-fd"], { cwd, stdio: "pipe" });
    }
    catch { /* ok */ }
}
function cleanupWorktree(baseBranch, cwd) {
    try {
        (0, node_child_process_1.execFileSync)("git", ["reset", "--hard", "HEAD"], { cwd, stdio: "pipe" });
    }
    catch { /* ok */ }
    try {
        (0, node_child_process_1.execFileSync)("git", ["clean", "-fd"], { cwd, stdio: "pipe" });
    }
    catch { /* ok */ }
    try {
        (0, node_child_process_1.execFileSync)("git", ["checkout", "-f", baseBranch], { cwd, stdio: "pipe" });
    }
    catch { /* ok */ }
}
/**
 * Stages, commits, and pushes changes. Returns whether a commit was made.
 * Skips if there are no staged changes after git add.
 */
function commitAndPush(opts) {
    stageAll(opts.cwd);
    if (!hasStagedChanges(opts.cwd)) {
        return { committed: false, branch: opts.branch };
    }
    commit(opts.message, opts.cwd);
    if (opts.pushRef) {
        pushToRef(opts.pushRef, opts.token, opts.repo, opts.cwd, {
            forceWithLeaseOid: opts.pushLeaseOid,
        });
    }
    else {
        pushBranch(opts.branch, opts.token, opts.repo, opts.cwd, {
            setUpstream: opts.setUpstream,
        });
    }
    return { committed: true, branch: opts.branch };
}
function pushHeadUpdate(opts) {
    pushToRef(opts.branch, opts.token, opts.repo, opts.cwd, {
        forceWithLeaseOid: opts.expectedHead,
    });
}
//# sourceMappingURL=git.js.map