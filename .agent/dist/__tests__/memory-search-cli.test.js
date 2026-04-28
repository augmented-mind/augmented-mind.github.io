"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const search_js_1 = require("../cli/memory/search.js");
function outputBuffer() {
    let text = "";
    return {
        write(chunk) { text += chunk; },
        read() { return text; },
    };
}
(0, node_test_1.test)("runMemorySearchCli returns a clean error when the memory directory is missing", () => {
    const stdout = outputBuffer();
    const stderr = outputBuffer();
    const exitCode = (0, search_js_1.runMemorySearchCli)(["--dir", "/tmp/definitely-missing-memory-dir", "memory"], { stdout, stderr });
    node_assert_1.strict.equal(exitCode, 1);
    node_assert_1.strict.equal(stdout.read(), "");
    node_assert_1.strict.match(stderr.read(), /Memory directory not found/);
});
//# sourceMappingURL=memory-search-cli.test.js.map