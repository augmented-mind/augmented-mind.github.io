"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const init_js_1 = require("../cli/memory/init.js");
function outputBuffer() {
    let text = "";
    return {
        write(chunk) { text += chunk; },
        read() { return text; },
    };
}
(0, node_test_1.test)("runMemoryInitCli seeds the default memory structure", () => {
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "memory-init-"));
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    const exitCode = (0, init_js_1.runMemoryInitCli)(["--dir", root, "--repo", "self-evolving/repo"], { stdout, stderr });
    node_assert_1.strict.equal(exitCode, 0);
    node_assert_1.strict.equal(stderr.read(), "");
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "README.md")));
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "PROJECT.md")));
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "MEMORY.md")));
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "daily")));
    node_assert_1.strict.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "github")));
    node_assert_1.strict.match((0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "README.md"), "utf8"), /# Agent memory/);
    node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "PROJECT.md"), "utf8"), "");
    node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8"), "");
    node_assert_1.strict.match(stdout.read(), /"createdFiles"/);
});
(0, node_test_1.test)("runMemoryInitCli rejects a missing repo slug", () => {
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "memory-init-missing-"));
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    const exitCode = (0, init_js_1.runMemoryInitCli)(["--dir", root], {
        env: { MEMORY_DIR: root },
        stdout,
        stderr,
    });
    node_assert_1.strict.equal(exitCode, 1);
    node_assert_1.strict.equal(stdout.read(), "");
    node_assert_1.strict.match(stderr.read(), /Missing or invalid repository slug/);
});
//# sourceMappingURL=memory-init-cli.test.js.map