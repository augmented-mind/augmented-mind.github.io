"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const approval_js_1 = require("../approval.js");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
function parseGithubOutput(path) {
    const raw = (0, node_fs_1.readFileSync)(path, "utf8");
    const outputs = new Map();
    const blocks = raw.matchAll(/^([^<\n]+)<<([^\n]+)\n([\s\S]*?)\n\2$/gm);
    for (const [, name, , value] of blocks) {
        outputs.set(name, value);
    }
    return outputs;
}
(0, node_test_1.test)("resolve-approval skips agent-managed approval request comments", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-resolve-approval-"));
    try {
        const eventPath = (0, node_path_1.join)(tempDir, "event.json");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const marker = (0, approval_js_1.buildApprovalRequestMarker)({
            request_id: "req-a1b2c3",
            route: "implement",
            target_kind: "issue",
            target_number: 138,
        });
        (0, node_fs_1.writeFileSync)(eventPath, JSON.stringify({
            sender: { login: "githubuser", type: "User" },
            comment: {
                id: 101,
                node_id: "IC_101",
                body: [
                    "I triaged this as an `implement` request.",
                    "",
                    "```text",
                    "@sepo-agent /approve req-a1b2c3",
                    "```",
                    "",
                    marker,
                ].join("\n"),
                author_association: "MEMBER",
                user: { login: "githubuser" },
            },
            issue: {
                number: 138,
                html_url: "https://github.com/self-evolving/repo/issues/138",
            },
        }), "utf8");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        (0, node_child_process_1.execFileSync)("node", [".agent/dist/cli/resolve-approval.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                GITHUB_EVENT_PATH: eventPath,
                GITHUB_EVENT_NAME: "issue_comment",
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                INPUT_MENTION: "@sepo-agent",
            },
            stdio: "pipe",
        });
        const outputs = parseGithubOutput(outputPath);
        node_assert_1.strict.equal(outputs.get("should_dispatch"), "false");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-approval reports invalid AGENT_ACCESS_POLICY cleanly", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-resolve-approval-"));
    try {
        const eventPath = (0, node_path_1.join)(tempDir, "event.json");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        (0, node_fs_1.writeFileSync)(eventPath, JSON.stringify({
            sender: { login: "alice", type: "User" },
            comment: {
                id: 102,
                node_id: "IC_102",
                body: "@sepo-agent /approve req-a1b2c3",
                author_association: "MEMBER",
                user: { login: "alice" },
            },
            issue: {
                number: 138,
                html_url: "https://github.com/self-evolving/repo/issues/138",
            },
        }), "utf8");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/resolve-approval.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                GITHUB_EVENT_PATH: eventPath,
                GITHUB_EVENT_NAME: "issue_comment",
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                INPUT_MENTION: "@sepo-agent",
                ACCESS_POLICY: "{",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 2);
        node_assert_1.strict.match(result.stderr, /Invalid AGENT_ACCESS_POLICY:/);
        node_assert_1.strict.doesNotMatch(result.stderr, /at parseAccessPolicy/);
        const outputs = parseGithubOutput(outputPath);
        node_assert_1.strict.equal(outputs.get("should_dispatch"), "false");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-approval applies access policy to the pending request route", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-resolve-approval-"));
    try {
        const eventPath = (0, node_path_1.join)(tempDir, "event.json");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const fakeGh = (0, node_path_1.join)(tempDir, "gh");
        const marker = (0, approval_js_1.buildApprovalRequestMarker)({
            request_id: "req-a1b2c3",
            route: "implement",
            target_kind: "issue",
            target_number: 138,
            target_url: "https://github.com/self-evolving/repo/issues/138",
            workflow: "agent-implement.yml",
            request_text: "please implement this",
        });
        (0, node_fs_1.writeFileSync)(eventPath, JSON.stringify({
            sender: { login: "alice", type: "User" },
            repository: { private: true },
            comment: {
                id: 102,
                node_id: "IC_102",
                body: "@sepo-agent /approve req-a1b2c3",
                author_association: "CONTRIBUTOR",
                user: { login: "alice" },
            },
            issue: {
                number: 138,
                html_url: "https://github.com/self-evolving/repo/issues/138",
            },
        }), "utf8");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        (0, node_fs_1.writeFileSync)(fakeGh, `#!/usr/bin/env bash
if [ "$1" = "api" ]; then
  printf '[{"id":201,"created_at":"2026-04-23T00:00:00Z","body":%s}]\\n' "$(node -e 'process.stdout.write(JSON.stringify(process.env.MARKER_BODY))')"
  exit 0
fi
exit 1
`, { encoding: "utf8", mode: 0o755 });
        (0, node_child_process_1.execFileSync)("node", [".agent/dist/cli/resolve-approval.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                MARKER_BODY: `Approval request\n\n${marker}`,
                GITHUB_EVENT_PATH: eventPath,
                GITHUB_EVENT_NAME: "issue_comment",
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                INPUT_MENTION: "@sepo-agent",
                ACCESS_POLICY: JSON.stringify({
                    allowed_associations: ["OWNER", "MEMBER", "COLLABORATOR", "CONTRIBUTOR"],
                    route_overrides: {
                        implement: ["OWNER", "MEMBER"],
                    },
                }),
                REPOSITORY_PRIVATE: "true",
            },
            stdio: "pipe",
        });
        const outputs = parseGithubOutput(outputPath);
        node_assert_1.strict.equal(outputs.get("should_dispatch"), "false");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("resolve-approval permits route approvals allowed by access policy", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-resolve-approval-"));
    try {
        const eventPath = (0, node_path_1.join)(tempDir, "event.json");
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        const fakeGh = (0, node_path_1.join)(tempDir, "gh");
        const marker = (0, approval_js_1.buildApprovalRequestMarker)({
            request_id: "req-d4e5f6",
            route: "implement",
            target_kind: "issue",
            target_number: 139,
            target_url: "https://github.com/self-evolving/repo/issues/139",
            workflow: "agent-implement.yml",
            request_text: "please implement this",
        });
        (0, node_fs_1.writeFileSync)(eventPath, JSON.stringify({
            sender: { login: "alice", type: "User" },
            repository: { private: true },
            comment: {
                id: 103,
                node_id: "IC_103",
                body: "@sepo-agent /approve req-d4e5f6",
                author_association: "MEMBER",
                user: { login: "alice" },
            },
            issue: {
                number: 139,
                html_url: "https://github.com/self-evolving/repo/issues/139",
            },
        }), "utf8");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        (0, node_fs_1.writeFileSync)(fakeGh, `#!/usr/bin/env bash
if [ "$1" = "api" ]; then
  printf '[{"id":202,"created_at":"2026-04-23T00:00:00Z","body":%s}]\\n' "$(node -e 'process.stdout.write(JSON.stringify(process.env.MARKER_BODY))')"
  exit 0
fi
exit 1
`, { encoding: "utf8", mode: 0o755 });
        (0, node_child_process_1.execFileSync)("node", [".agent/dist/cli/resolve-approval.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                PATH: `${tempDir}:${process.env.PATH || ""}`,
                MARKER_BODY: `Approval request\n\n${marker}`,
                GITHUB_EVENT_PATH: eventPath,
                GITHUB_EVENT_NAME: "issue_comment",
                GITHUB_OUTPUT: outputPath,
                GITHUB_REPOSITORY: "self-evolving/repo",
                INPUT_MENTION: "@sepo-agent",
                ACCESS_POLICY: JSON.stringify({
                    route_overrides: {
                        implement: ["OWNER", "MEMBER"],
                    },
                }),
                REPOSITORY_PRIVATE: "true",
            },
            stdio: "pipe",
        });
        const outputs = parseGithubOutput(outputPath);
        node_assert_1.strict.equal(outputs.get("should_dispatch"), "true");
        node_assert_1.strict.equal(outputs.get("route"), "implement");
        node_assert_1.strict.equal(outputs.get("workflow"), "agent-implement.yml");
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=resolve-approval-cli.test.js.map