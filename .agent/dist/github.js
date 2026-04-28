"use strict";
// GitHub API helpers for workflow post-processing steps.
//
// These functions wrap gh CLI operations that workflows perform: posting
// comments, creating PRs, fetching metadata, dispatching workflows.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_BUFFER = void 0;
exports.gh = gh;
exports.ghApi = ghApi;
exports.ghApiOk = ghApiOk;
exports.postIssueComment = postIssueComment;
exports.postPrComment = postPrComment;
exports.ensureLabel = ensureLabel;
exports.addIssueLabel = addIssueLabel;
exports.addPrLabel = addPrLabel;
exports.fetchPrMeta = fetchPrMeta;
exports.findExistingPr = findExistingPr;
exports.createPr = createPr;
exports.createIssue = createIssue;
exports.dispatchWorkflow = dispatchWorkflow;
const node_child_process_1 = require("node:child_process");
exports.MAX_BUFFER = 10 * 1024 * 1024;
function gh(args, cwd) {
    return (0, node_child_process_1.execFileSync)("gh", args, {
        cwd,
        stdio: "pipe",
        maxBuffer: exports.MAX_BUFFER,
    }).toString("utf8");
}
/**
 * Runs `gh api <args>` and returns trimmed stdout. Returns "" on any
 * non-zero exit. Use for best-effort lookups where a 404 is an expected
 * answer (e.g. "is this user a collaborator?").
 */
function ghApi(args) {
    try {
        return gh(["api", ...args]).trim();
    }
    catch {
        return "";
    }
}
/**
 * Returns true if `gh api <args>` exits 0. Use for endpoints that return
 * 204 on success (no body) and 404 on absence, where `ghApi` can't
 * distinguish the two.
 */
function ghApiOk(args) {
    try {
        gh(["api", ...args]);
        return true;
    }
    catch {
        return false;
    }
}
// --- Comments ---
function postIssueComment(issueNumber, body, repo) {
    const args = ["issue", "comment", String(issueNumber), "--body", body];
    if (repo)
        args.push("--repo", repo);
    gh(args);
}
function postPrComment(prNumber, body, repo) {
    const args = ["pr", "comment", String(prNumber), "--body", body];
    if (repo)
        args.push("--repo", repo);
    gh(args);
}
function commandErrorText(err) {
    const record = err;
    return [record.message, record.stderr, record.stdout]
        .map((part) => {
        if (Buffer.isBuffer(part))
            return part.toString("utf8");
        return typeof part === "string" ? part : "";
    })
        .filter(Boolean)
        .join("\n");
}
function isAlreadyExistsLabelError(err) {
    return /already exists|already_exists|name has already been taken/i.test(commandErrorText(err));
}
function ensureLabel(opts) {
    const name = opts.name.trim();
    if (!name)
        return;
    const listArgs = ["label", "list", "--search", name, "--json", "name", "--jq", ".[].name"];
    if (opts.repo)
        listArgs.push("--repo", opts.repo);
    const existing = gh(listArgs)
        .split(/\r?\n/)
        .some((line) => line.trim() === name);
    if (existing)
        return;
    const createArgs = [
        "label",
        "create",
        name,
        "--color",
        opts.color,
        "--description",
        opts.description,
    ];
    if (opts.repo)
        createArgs.push("--repo", opts.repo);
    try {
        gh(createArgs);
    }
    catch (err) {
        if (!isAlreadyExistsLabelError(err))
            throw err;
    }
}
function addIssueLabel(issueNumber, label, repo) {
    const args = ["issue", "edit", String(issueNumber), "--add-label", label];
    if (repo)
        args.push("--repo", repo);
    gh(args);
}
function addPrLabel(prNumber, label, repo) {
    const args = ["pr", "edit", String(prNumber), "--add-label", label];
    if (repo)
        args.push("--repo", repo);
    gh(args);
}
function fetchPrMeta(prNumber, repo) {
    const args = ["pr", "view", String(prNumber), "--json", "headRefName,headRefOid,isCrossRepository,state"];
    if (repo)
        args.push("--repo", repo);
    const data = JSON.parse(gh(args));
    return {
        headRef: String(data.headRefName ?? ""),
        headOid: String(data.headRefOid ?? ""),
        isCrossRepository: Boolean(data.isCrossRepository),
        state: String(data.state ?? ""),
    };
}
function findExistingPr(headBranch, repo) {
    const args = ["pr", "list", "--head", headBranch, "--json", "url", "--jq", ".[0].url // empty"];
    if (repo)
        args.push("--repo", repo);
    const url = gh(args).trim();
    return url || null;
}
function createPr(opts) {
    const args = ["pr", "create"];
    if (opts.draft)
        args.push("--draft");
    args.push("--base", opts.base, "--head", opts.head, "--title", opts.title, "--body-file", opts.bodyFile);
    if (opts.repo)
        args.push("--repo", opts.repo);
    return gh(args).trim();
}
function createIssue(opts) {
    const args = ["issue", "create", "--title", opts.title, "--body-file", opts.bodyFile];
    if (opts.repo)
        args.push("--repo", opts.repo);
    return gh(args).trim();
}
// --- Workflow dispatch ---
function dispatchWorkflow(repo, workflow, ref, inputs) {
    const payload = JSON.stringify({ ref, inputs });
    (0, node_child_process_1.execFileSync)("gh", [
        "api", "-X", "POST",
        `repos/${repo}/actions/workflows/${workflow}/dispatches`,
        "--input", "-",
    ], {
        input: payload,
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: exports.MAX_BUFFER,
    });
}
//# sourceMappingURL=github.js.map