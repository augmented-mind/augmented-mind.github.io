"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const update_js_1 = require("../cli/memory/update.js");
function outputBuffer() {
    let text = "";
    return {
        write(chunk) { text += chunk; },
        read() { return text; },
    };
}
(0, node_test_1.test)("runMemoryUpdateCli reports ambiguous matches without mutating the file", () => {
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "mem-update-cli-"));
    const path = (0, node_path_1.join)(root, "MEMORY.md");
    (0, node_fs_1.writeFileSync)(path, ["# Memory", "", "## Durable", "- alpha one", "- alpha two", ""].join("\n"));
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    const exitCode = (0, update_js_1.runMemoryUpdateCli)(["remove", "--dir", root, "--file", "MEMORY.md", "--section", "Durable", "--match", "alpha"], { stdout, stderr });
    node_assert_1.strict.equal(exitCode, 2);
    node_assert_1.strict.equal(stdout.read(), "");
    const stderrText = stderr.read();
    node_assert_1.strict.match(stderrText, /multiple bullets matched: alpha/);
    node_assert_1.strict.match(stderrText, /^- alpha one$/m);
    node_assert_1.strict.match(stderrText, /^- alpha two$/m);
});
(0, node_test_1.test)("runMemoryUpdateCli reports deduped when --with already matches a different bullet", () => {
    // Semantics: the source bullet ("alpha") is removed and the existing
    // --with target ("beta") is kept, collapsing the section to one entry.
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "mem-update-cli-"));
    const path = (0, node_path_1.join)(root, "MEMORY.md");
    (0, node_fs_1.writeFileSync)(path, ["# Memory", "", "## Durable", "- alpha", "- beta", ""].join("\n"));
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    const exitCode = (0, update_js_1.runMemoryUpdateCli)([
        "replace",
        "--dir", root,
        "--file", "MEMORY.md",
        "--section", "Durable",
        "--match", "alpha",
        "--with", "beta",
    ], { stdout, stderr });
    node_assert_1.strict.equal(exitCode, 0);
    node_assert_1.strict.equal(stderr.read(), "");
    node_assert_1.strict.match(stdout.read(), /collapsed duplicate bullet/);
    const after = (0, node_fs_1.readFileSync)(path, "utf8");
    node_assert_1.strict.match(after, /^- beta$/m);
    node_assert_1.strict.doesNotMatch(after, /^- alpha$/m);
    // Only one bullet remains under Durable.
    const bullets = after.split("\n").filter((line) => /^-\s/.test(line));
    node_assert_1.strict.equal(bullets.length, 1);
});
//# sourceMappingURL=memory-update-cli.test.js.map