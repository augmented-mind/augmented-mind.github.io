"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const memory_search_js_1 = require("../memory-search.js");
function makeTree() {
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "mem-search-"));
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "# Memory\n\n## Durable\n- prefer explicit request ids over scan-and-filter\n- review dashboards live at grafana.internal/d/agent\n");
    (0, node_fs_1.mkdirSync)((0, node_path_1.join)(root, "daily"), { recursive: true });
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "daily", "2026-04-01.md"), "# Daily log for 2026-04-01\n\n## Activity\n- merged PR #209 introducing memory sync cursors\n- discussed rubric scope for #51\n");
    (0, node_fs_1.mkdirSync)((0, node_path_1.join)(root, "github"), { recursive: true });
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "github", "pull-209.json"), JSON.stringify({
        number: 209,
        title: "Add agent memory search",
        url: "https://github.com/self-evolving/repo/pull/209",
        state: "MERGED",
    }, null, 2) + "\n");
    return root;
}
(0, node_test_1.test)("tokenizeMemorySearchQuery splits on non-alphanumerics and drops duplicates", () => {
    node_assert_1.strict.deepEqual((0, memory_search_js_1.tokenizeMemorySearchQuery)("Memory Search — memory search!"), ["memory", "search"]);
});
(0, node_test_1.test)("tokenizeMemorySearchQuery keeps pure-number tokens", () => {
    node_assert_1.strict.deepEqual((0, memory_search_js_1.tokenizeMemorySearchQuery)("issue #209"), ["issue", "209"]);
});
(0, node_test_1.test)("searchMemory ranks files with more matches higher and returns snippets", () => {
    const root = makeTree();
    const results = (0, memory_search_js_1.searchMemory)("memory", { rootDir: root, limit: 5 });
    node_assert_1.strict.ok(results.length >= 2);
    const paths = results.map((r) => r.path);
    node_assert_1.strict.ok(paths.includes("MEMORY.md"));
    node_assert_1.strict.ok(results[0].snippets.length >= 1);
});
(0, node_test_1.test)("searchMemory returns empty when query has no real tokens", () => {
    const root = makeTree();
    node_assert_1.strict.deepEqual((0, memory_search_js_1.searchMemory)("!!!", { rootDir: root }), []);
});
(0, node_test_1.test)("searchMemory respects --limit", () => {
    const root = makeTree();
    const results = (0, memory_search_js_1.searchMemory)("memory", { rootDir: root, limit: 1 });
    node_assert_1.strict.equal(results.length, 1);
});
(0, node_test_1.test)("searchMemory prefers exact phrase and path matches in the JSON mirror", () => {
    const root = makeTree();
    const results = (0, memory_search_js_1.searchMemory)("pull 209", { rootDir: root, limit: 5 });
    node_assert_1.strict.equal(results[0].path, "github/pull-209.json");
});
(0, node_test_1.test)("searchMemory keeps path-only matches even when content does not contain the query", () => {
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "mem-search-"));
    (0, node_fs_1.mkdirSync)((0, node_path_1.join)(root, "github"), { recursive: true });
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "github", "pull-209.json"), JSON.stringify({ number: 209, kind: "pr" }, null, 2) + "\n");
    const results = (0, memory_search_js_1.searchMemory)("pull", { rootDir: root, limit: 5 });
    node_assert_1.strict.equal(results.length, 1);
    node_assert_1.strict.equal(results[0].path, "github/pull-209.json");
    node_assert_1.strict.equal(results[0].snippets[0].lineNumber, 0);
    node_assert_1.strict.match(results[0].snippets[0].text, /number|matched by filename/);
});
(0, node_test_1.test)("searchMemory ranks exact-phrase hits above the same tokens split across lines", () => {
    // Isolates the phrase-match bonus from the path bonus: neither filename
    // mentions the query. One file has the phrase in a single line, the other
    // has the two tokens on separate lines. The phrase-hit file should win.
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "mem-search-phrase-"));
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "phrase.md"), "# Notes\n\n- we discussed memory sync in depth\n");
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "split.md"), "# Notes\n\n- memory context was considered\n- sync jobs run hourly\n");
    const results = (0, memory_search_js_1.searchMemory)("memory sync", { rootDir: root, limit: 5 });
    node_assert_1.strict.equal(results.length, 2);
    node_assert_1.strict.equal(results[0].path, "phrase.md");
    node_assert_1.strict.ok(results[0].score > results[1].score, `expected phrase.md to outscore split.md (got ${results[0].score} vs ${results[1].score})`);
});
(0, node_test_1.test)("searchMemory throws when the memory directory does not exist", () => {
    node_assert_1.strict.throws(() => (0, memory_search_js_1.searchMemory)("memory", { rootDir: "/tmp/definitely-missing-memory-dir" }), /Memory directory not found/);
});
(0, node_test_1.test)("formatMemorySearchResults renders a readable header even with no matches", () => {
    const rendered = (0, memory_search_js_1.formatMemorySearchResults)("x", [], "/tmp/empty");
    node_assert_1.strict.match(rendered, /Memory search: "x"/);
    node_assert_1.strict.match(rendered, /No matches/);
});
//# sourceMappingURL=memory-search.test.js.map