"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
function writeFakeGh(tempDir, body) {
    const fakeGh = (0, node_path_1.join)(tempDir, "gh");
    (0, node_fs_1.writeFileSync)(fakeGh, body, { encoding: "utf8", mode: 0o755 });
    return fakeGh;
}
function runAddLabel(tempDir, env) {
    return (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/add-label.js"], {
        cwd: repoRoot,
        env: {
            ...process.env,
            PATH: `${tempDir}:${process.env.PATH || ""}`,
            ...env,
        },
        encoding: "utf8",
    });
}
(0, node_test_1.test)("add-label CLI skips all gh calls unless AGENT_STATUS_LABEL_ENABLED is true", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-add-label-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
exit 1
`);
        const result = runAddLabel(tempDir, {
            AGENT_STATUS_LABEL_ENABLED: "",
            FAKE_GH_LOG: logPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
            TARGET_KIND: "issue",
            TARGET_NUMBER: "42",
        });
        node_assert_1.strict.equal(result.status, 0);
        node_assert_1.strict.match(result.stdout, /skipping status label/);
        node_assert_1.strict.equal((0, node_fs_1.existsSync)(logPath), false);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("add-label CLI creates the fixed label and applies it to issues", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-add-label-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "label" ] && [ "$2" = "list" ]; then
  exit 0
fi
if [ "$1" = "label" ] && [ "$2" = "create" ]; then
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "edit" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = runAddLabel(tempDir, {
            AGENT_STATUS_LABEL_ENABLED: "true",
            FAKE_GH_LOG: logPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
            TARGET_KIND: "issue",
            TARGET_NUMBER: "42",
        });
        node_assert_1.strict.equal(result.status, 0);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^label list --search agent --json name --jq \.\[\]\.name --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^label create agent --color 0e8a16 --description Handled by the agent --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^issue edit 42 --add-label agent --repo self-evolving\/repo$/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("add-label CLI treats concurrent label creation as success before applying the label", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-add-label-"));
    try {
        const logPath = (0, node_path_1.join)(tempDir, "gh.log");
        writeFakeGh(tempDir, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_GH_LOG"
if [ "$1" = "label" ] && [ "$2" = "list" ]; then
  exit 0
fi
if [ "$1" = "label" ] && [ "$2" = "create" ]; then
  printf 'already exists\\n' >&2
  exit 1
fi
if [ "$1" = "pull_request" ] && [ "$2" = "edit" ]; then
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "edit" ]; then
  exit 0
fi
printf 'unexpected gh args: %s\\n' "$*" >&2
exit 1
`);
        const result = runAddLabel(tempDir, {
            AGENT_STATUS_LABEL_ENABLED: "true",
            FAKE_GH_LOG: logPath,
            GITHUB_REPOSITORY: "self-evolving/repo",
            TARGET_KIND: "pull_request",
            TARGET_NUMBER: "12",
        });
        node_assert_1.strict.equal(result.status, 0);
        const log = (0, node_fs_1.readFileSync)(logPath, "utf8");
        node_assert_1.strict.match(log, /^label create agent --color 0e8a16 --description Handled by the agent --repo self-evolving\/repo$/m);
        node_assert_1.strict.match(log, /^pr edit 12 --add-label agent --repo self-evolving\/repo$/m);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=add-label-cli.test.js.map