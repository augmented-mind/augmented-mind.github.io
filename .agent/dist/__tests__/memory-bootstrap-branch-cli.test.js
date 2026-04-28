"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const bootstrap_branch_js_1 = require("../cli/memory/bootstrap-branch.js");
function outputBuffer() {
    let text = "";
    return {
        write(chunk) { text += chunk; },
        read() { return text; },
    };
}
function gitIn(dir, args) {
    return (0, node_child_process_1.execFileSync)("git", args, {
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
    }).toString("utf8").trim();
}
(0, node_test_1.test)("parseGitHubRepoSlugFromRemoteUrl handles ssh and https remotes", () => {
    node_assert_1.strict.equal((0, bootstrap_branch_js_1.parseGitHubRepoSlugFromRemoteUrl)("git@github.com:self-evolving/repo.git"), "self-evolving/repo");
    node_assert_1.strict.equal((0, bootstrap_branch_js_1.parseGitHubRepoSlugFromRemoteUrl)("https://github.com/self-evolving/repo.git"), "self-evolving/repo");
    node_assert_1.strict.equal((0, bootstrap_branch_js_1.parseGitHubRepoSlugFromRemoteUrl)("/tmp/local-remote.git"), "");
});
(0, node_test_1.test)("runMemoryBootstrapBranchCli creates a local agent/memory branch", () => {
    const base = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "memory-bootstrap-"));
    const remoteDir = (0, node_path_1.join)(base, "remote.git");
    const workDir = (0, node_path_1.join)(base, "work");
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    try {
        (0, node_child_process_1.execFileSync)("git", ["init", "--bare", remoteDir], { stdio: "pipe" });
        (0, node_child_process_1.execFileSync)("git", ["clone", remoteDir, workDir], { stdio: "pipe" });
        gitIn(workDir, ["config", "user.name", "test"]);
        gitIn(workDir, ["config", "user.email", "test@test.com"]);
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(workDir, "README.md"), "# Test repo\n", "utf8");
        gitIn(workDir, ["add", "README.md"]);
        gitIn(workDir, ["commit", "-m", "initial"]);
        const exitCode = (0, bootstrap_branch_js_1.runMemoryBootstrapBranchCli)(["--repo", "self-evolving/repo"], { cwd: workDir, stdout, stderr });
        node_assert_1.strict.equal(exitCode, 0);
        node_assert_1.strict.equal(stderr.read(), "");
        node_assert_1.strict.match(stdout.read(), /"branch": "agent\/memory"/);
        node_assert_1.strict.match(stdout.read(), /"createdBranch": true/);
        node_assert_1.strict.match(stdout.read(), /"nextStep": "git push origin agent\/memory"/);
        node_assert_1.strict.notEqual(gitIn(workDir, ["rev-parse", "--abbrev-ref", "HEAD"]), "agent/memory");
        node_assert_1.strict.match(gitIn(workDir, ["show", "agent/memory:README.md"]), /# Agent memory/);
        node_assert_1.strict.equal(gitIn(workDir, ["show", "agent/memory:PROJECT.md"]), "");
        node_assert_1.strict.equal(gitIn(workDir, ["show", "agent/memory:MEMORY.md"]), "");
        node_assert_1.strict.equal(gitIn(workDir, ["show", "agent/memory:daily/.gitkeep"]), "");
        node_assert_1.strict.equal(gitIn(workDir, ["show", "agent/memory:github/.gitkeep"]), "");
    }
    finally {
        (0, node_fs_1.rmSync)(base, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("runMemoryBootstrapBranchCli reuses an existing remote memory branch", () => {
    const base = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "memory-bootstrap-remote-"));
    const remoteDir = (0, node_path_1.join)(base, "remote.git");
    const seedDir = (0, node_path_1.join)(base, "seed");
    const workDir = (0, node_path_1.join)(base, "work");
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    try {
        (0, node_child_process_1.execFileSync)("git", ["init", "--bare", remoteDir], { stdio: "pipe" });
        (0, node_child_process_1.execFileSync)("git", ["clone", remoteDir, seedDir], { stdio: "pipe" });
        gitIn(seedDir, ["config", "user.name", "test"]);
        gitIn(seedDir, ["config", "user.email", "test@test.com"]);
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(seedDir, "README.md"), "# Test repo\n", "utf8");
        gitIn(seedDir, ["add", "README.md"]);
        gitIn(seedDir, ["commit", "-m", "initial"]);
        gitIn(seedDir, ["push", "origin", "HEAD"]);
        gitIn(seedDir, ["checkout", "--orphan", "agent/memory"]);
        gitIn(seedDir, ["rm", "-rf", "."]);
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(seedDir, "NOTES.md"), "remote memory branch\n", "utf8");
        gitIn(seedDir, ["add", "NOTES.md"]);
        gitIn(seedDir, ["commit", "-m", "seed memory"]);
        gitIn(seedDir, ["push", "origin", "agent/memory"]);
        (0, node_child_process_1.execFileSync)("git", ["clone", remoteDir, workDir], { stdio: "pipe" });
        gitIn(workDir, ["config", "user.name", "test"]);
        gitIn(workDir, ["config", "user.email", "test@test.com"]);
        node_assert_1.strict.equal(gitIn(workDir, ["branch", "--list", "agent/memory"]), "");
        node_assert_1.strict.notEqual(gitIn(workDir, ["branch", "-r", "--list", "origin/agent/memory"]), "");
        const exitCode = (0, bootstrap_branch_js_1.runMemoryBootstrapBranchCli)(["--repo", "self-evolving/repo"], { cwd: workDir, stdout, stderr });
        node_assert_1.strict.equal(exitCode, 0);
        node_assert_1.strict.equal(stderr.read(), "");
        node_assert_1.strict.equal(gitIn(workDir, ["show", "agent/memory:NOTES.md"]), "remote memory branch");
        node_assert_1.strict.match(gitIn(workDir, ["show", "agent/memory:README.md"]), /# Agent memory/);
        node_assert_1.strict.equal(gitIn(workDir, ["show", "agent/memory:PROJECT.md"]), "");
    }
    finally {
        (0, node_fs_1.rmSync)(base, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("runMemoryBootstrapBranchCli fails clearly when the target branch is already checked out", () => {
    const base = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "memory-bootstrap-current-branch-"));
    const repoDir = (0, node_path_1.join)(base, "repo");
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    try {
        (0, node_child_process_1.execFileSync)("git", ["init", repoDir], { stdio: "pipe" });
        gitIn(repoDir, ["config", "user.name", "test"]);
        gitIn(repoDir, ["config", "user.email", "test@test.com"]);
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(repoDir, "README.md"), "# Test repo\n", "utf8");
        gitIn(repoDir, ["add", "README.md"]);
        gitIn(repoDir, ["commit", "-m", "initial"]);
        gitIn(repoDir, ["checkout", "-b", "agent/memory"]);
        const exitCode = (0, bootstrap_branch_js_1.runMemoryBootstrapBranchCli)(["--repo", "self-evolving/repo"], { cwd: repoDir, stdout, stderr });
        node_assert_1.strict.equal(exitCode, 1);
        node_assert_1.strict.equal(stdout.read(), "");
        node_assert_1.strict.match(stderr.read(), /already checked out in the current worktree/);
    }
    finally {
        (0, node_fs_1.rmSync)(base, { recursive: true, force: true });
    }
});
//# sourceMappingURL=memory-bootstrap-branch-cli.test.js.map