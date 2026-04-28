"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const memory_artifacts_js_1 = require("../memory-artifacts.js");
(0, node_test_1.test)("ensureMemoryStructure seeds README.md, PROJECT.md, MEMORY.md, and top-level dirs", () => {
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "mem-artifacts-"));
    const first = (0, memory_artifacts_js_1.ensureMemoryStructure)(root, "owner/repo");
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "README.md")));
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "PROJECT.md")));
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "MEMORY.md")));
    node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "README.md"), "utf8"), memory_artifacts_js_1.MEMORY_README);
    node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "PROJECT.md"), "utf8"), "");
    node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8"), "");
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "daily")));
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "github")));
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "daily", ".gitkeep")));
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "github", ".gitkeep")));
    node_assert_1.strict.ok(first.createdFiles.length >= 4);
    // No per-type subdirectories — the flat layout encodes the type in the
    // filename (issue-<n>.json, pull-<n>.json, etc).
    node_assert_1.strict.equal((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "github", "issues")), false);
    node_assert_1.strict.equal((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "github", "pulls")), false);
    node_assert_1.strict.equal((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "github", "discussions")), false);
    node_assert_1.strict.equal((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "github", "commits")), false);
    const second = (0, memory_artifacts_js_1.ensureMemoryStructure)(root, "owner/repo");
    node_assert_1.strict.deepEqual(second.createdFiles, []);
});
(0, node_test_1.test)("artifact paths are flat and type-prefixed", () => {
    node_assert_1.strict.equal((0, memory_artifacts_js_1.issueArtifactPath)("/m", 5), "/m/github/issue-5.json");
    node_assert_1.strict.equal((0, memory_artifacts_js_1.pullRequestArtifactPath)("/m", 7), "/m/github/pull-7.json");
    node_assert_1.strict.equal((0, memory_artifacts_js_1.discussionArtifactPath)("/m", 42), "/m/github/discussion-42.json");
});
(0, node_test_1.test)("issue, pull, and discussion numbers never collide even if they share a counter", () => {
    // Same number, different kind — these must live in separate files.
    const paths = [
        (0, memory_artifacts_js_1.issueArtifactPath)("/m", 42),
        (0, memory_artifacts_js_1.pullRequestArtifactPath)("/m", 42),
        (0, memory_artifacts_js_1.discussionArtifactPath)("/m", 42),
    ];
    node_assert_1.strict.equal(new Set(paths).size, 3);
});
(0, node_test_1.test)("writeFileIfChanged only writes when content differs", () => {
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "mem-write-"));
    const path = (0, node_path_1.join)(root, "foo.json");
    node_assert_1.strict.equal((0, memory_artifacts_js_1.writeFileIfChanged)(path, "hello\n"), true);
    node_assert_1.strict.equal((0, memory_artifacts_js_1.writeFileIfChanged)(path, "hello\n"), false);
    node_assert_1.strict.equal((0, memory_artifacts_js_1.writeFileIfChanged)(path, "different\n"), true);
    node_assert_1.strict.equal((0, node_fs_1.readFileSync)(path, "utf8"), "different\n");
});
//# sourceMappingURL=memory-artifacts.test.js.map