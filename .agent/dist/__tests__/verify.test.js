"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_assert_1 = require("node:assert");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const verify_js_1 = require("../verify.js");
function git(cwd, args) {
    return (0, node_child_process_1.execFileSync)("git", args, {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
    }).toString("utf8").trim();
}
function runVerifier(cwd, env = {}) {
    return (0, node_child_process_1.spawnSync)("bash", [".agent/scripts/post-agent-verify.sh"], {
        cwd,
        env: { ...process.env, ...env },
        encoding: "utf8",
    });
}
(0, node_test_1.test)("shouldRunVerification skips unchanged clean runs", () => {
    node_assert_1.strict.equal((0, verify_js_1.shouldRunVerification)(false, false), false);
});
(0, node_test_1.test)("shouldRunVerification runs for dirty worktrees", () => {
    node_assert_1.strict.equal((0, verify_js_1.shouldRunVerification)(true, false), true);
});
(0, node_test_1.test)("shouldRunVerification runs for clean branch head updates", () => {
    node_assert_1.strict.equal((0, verify_js_1.shouldRunVerification)(false, true), true);
});
(0, node_test_1.test)("post-agent-verify uses VERIFY_BASE_SHA for clean history-only workflow changes", () => {
    const repo = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "post-agent-verify-"));
    try {
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(repo, ".agent", "scripts"), { recursive: true });
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(repo, ".github", "workflows"), { recursive: true });
        (0, node_fs_1.cpSync)((0, node_path_1.join)(process.cwd(), "scripts", "post-agent-verify.sh"), (0, node_path_1.join)(repo, ".agent", "scripts", "post-agent-verify.sh"));
        git(repo, ["init"]);
        git(repo, ["config", "user.name", "Test User"]);
        git(repo, ["config", "user.email", "test@example.com"]);
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(repo, ".github", "workflows", "ci.yml"), [
            "name: CI",
            "on: workflow_dispatch",
            "jobs:",
            "  check:",
            "    runs-on: ubuntu-latest",
            "    steps:",
            "      - run: echo ok",
            "",
        ].join("\n"), "utf8");
        git(repo, ["add", "."]);
        git(repo, ["commit", "-m", "seed workflow"]);
        const baseSha = git(repo, ["rev-parse", "HEAD"]);
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(repo, ".github", "workflows", "ci.yml"), "name: [unterminated\n", "utf8");
        git(repo, ["add", ".github/workflows/ci.yml"]);
        git(repo, ["commit", "-m", "break workflow yaml"]);
        node_assert_1.strict.equal(git(repo, ["status", "--porcelain"]), "");
        const result = runVerifier(repo, { VERIFY_BASE_SHA: baseSha });
        node_assert_1.strict.notEqual(result.status, 0, `history-aware verification should inspect changed workflow files\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    }
    finally {
        (0, node_fs_1.rmSync)(repo, { recursive: true, force: true });
    }
});
//# sourceMappingURL=verify.test.js.map