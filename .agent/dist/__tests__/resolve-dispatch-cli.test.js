"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
(0, node_test_1.test)("resolve-dispatch reports invalid AGENT_ACCESS_POLICY cleanly", () => {
    const tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-resolve-dispatch-"));
    try {
        const outputPath = (0, node_path_1.join)(tempDir, "github-output.txt");
        (0, node_fs_1.writeFileSync)(outputPath, "", "utf8");
        const result = (0, node_child_process_1.spawnSync)("node", [".agent/dist/cli/resolve-dispatch.js"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                GITHUB_OUTPUT: outputPath,
                REQUESTED_ROUTE: "answer",
                REQUEST_TEXT: "@sepo-agent /answer please check this",
                TARGET_KIND: "issue",
                AUTHOR_ASSOCIATION: "MEMBER",
                ACCESS_POLICY: "{",
                REPOSITORY_PRIVATE: "true",
            },
            encoding: "utf8",
        });
        node_assert_1.strict.equal(result.status, 2);
        node_assert_1.strict.match(result.stderr, /Invalid AGENT_ACCESS_POLICY:/);
        node_assert_1.strict.doesNotMatch(result.stderr, /at parseAccessPolicy/);
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=resolve-dispatch-cli.test.js.map