"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const memory_update_js_1 = require("../memory-update.js");
function newRoot() {
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "mem-update-"));
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "MEMORY.md"), ["# Memory", "", "## Durable", "- existing entry", ""].join("\n"));
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "PROJECT.md"), ["# Project", "", "## Open Questions", "- should we support semantic search?", ""].join("\n"));
    return root;
}
(0, node_test_1.test)("addBullet inserts under the matching section and normalizes the prefix", () => {
    const root = newRoot();
    const result = (0, memory_update_js_1.addBullet)({ root, file: "MEMORY.md", section: "Durable" }, "   prefer on-demand search over pre-built indices");
    node_assert_1.strict.equal(result.action.kind, "added");
    const content = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8");
    node_assert_1.strict.match(content, /- prefer on-demand search over pre-built indices/);
    node_assert_1.strict.match(content, /- existing entry/);
});
(0, node_test_1.test)("addBullet initializes an empty editable file with the requested section", () => {
    const root = newRoot();
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "", "utf8");
    const result = (0, memory_update_js_1.addBullet)({ root, file: "MEMORY.md", section: "Durable" }, "prefer concise durable notes");
    node_assert_1.strict.equal(result.action.kind, "added");
    node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8"), ["# Memory", "", "## Durable", "- prefer concise durable notes", ""].join("\n"));
});
(0, node_test_1.test)("addBullet is a no-op when the bullet already exists", () => {
    const root = newRoot();
    const result = (0, memory_update_js_1.addBullet)({ root, file: "MEMORY.md", section: "Durable" }, "existing entry");
    node_assert_1.strict.equal(result.action.kind, "noop");
});
(0, node_test_1.test)("addBullet reports missing section without mutating the file", () => {
    const root = newRoot();
    const before = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8");
    const result = (0, memory_update_js_1.addBullet)({ root, file: "MEMORY.md", section: "Nonexistent" }, "something");
    node_assert_1.strict.equal(result.action.kind, "missing_section");
    node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8"), before);
});
(0, node_test_1.test)("replaceBullet finds a case-insensitive substring and swaps the line", () => {
    const root = newRoot();
    const result = (0, memory_update_js_1.replaceBullet)({ root, file: "MEMORY.md", section: "Durable" }, "EXISTING entry", "updated entry");
    node_assert_1.strict.equal(result.action.kind, "replaced");
    const content = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8");
    node_assert_1.strict.match(content, /- updated entry/);
    node_assert_1.strict.doesNotMatch(content, /- existing entry/);
});
(0, node_test_1.test)("replaceBullet reports ambiguous_match when multiple distinct bullets match", () => {
    const root = newRoot();
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "MEMORY.md"), ["# Memory", "", "## Durable", "- alpha one", "- alpha two", ""].join("\n"));
    const result = (0, memory_update_js_1.replaceBullet)({ root, file: "MEMORY.md", section: "Durable" }, "alpha", "updated entry");
    node_assert_1.strict.equal(result.action.kind, "ambiguous_match");
    node_assert_1.strict.deepEqual(result.action.candidates, ["- alpha one", "- alpha two"]);
});
(0, node_test_1.test)("replaceBullet dedupes when the replacement already exists elsewhere in the section", () => {
    const root = newRoot();
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "MEMORY.md"), ["# Memory", "", "## Durable", "- alpha", "- beta", ""].join("\n"));
    const result = (0, memory_update_js_1.replaceBullet)({ root, file: "MEMORY.md", section: "Durable" }, "beta", "alpha");
    node_assert_1.strict.equal(result.action.kind, "deduped");
    const content = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8");
    node_assert_1.strict.equal((content.match(/^- alpha$/gm) || []).length, 1);
    node_assert_1.strict.doesNotMatch(content, /- beta/);
});
(0, node_test_1.test)("replaceBullet reports missing_match when nothing matches", () => {
    const root = newRoot();
    const result = (0, memory_update_js_1.replaceBullet)({ root, file: "MEMORY.md", section: "Durable" }, "missing text", "new entry");
    node_assert_1.strict.equal(result.action.kind, "missing_match");
});
(0, node_test_1.test)("removeBullet deletes the first matching bullet", () => {
    const root = newRoot();
    const result = (0, memory_update_js_1.removeBullet)({ root, file: "MEMORY.md", section: "Durable" }, "existing entry");
    node_assert_1.strict.equal(result.action.kind, "removed");
    const content = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8");
    node_assert_1.strict.doesNotMatch(content, /- existing entry/);
});
(0, node_test_1.test)("removeBullet reports ambiguous_match when multiple distinct bullets match", () => {
    const root = newRoot();
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, "MEMORY.md"), ["# Memory", "", "## Durable", "- alpha one", "- alpha two", ""].join("\n"));
    const result = (0, memory_update_js_1.removeBullet)({ root, file: "MEMORY.md", section: "Durable" }, "alpha");
    node_assert_1.strict.equal(result.action.kind, "ambiguous_match");
    node_assert_1.strict.deepEqual(result.action.candidates, ["- alpha one", "- alpha two"]);
});
(0, node_test_1.test)("appendDailyBullet creates the daily file with the expected header", () => {
    const root = newRoot();
    const result = (0, memory_update_js_1.appendDailyBullet)(root, "shipped v3 of agent memory");
    node_assert_1.strict.equal(result.action.kind, "added");
    const path = (0, memory_update_js_1.dailyLogPath)(root, (0, memory_update_js_1.todayDateUtc)());
    const content = (0, node_fs_1.readFileSync)(path, "utf8");
    node_assert_1.strict.match(content, /^# Daily log for \d{4}-\d{2}-\d{2}$/m);
    node_assert_1.strict.match(content, /^## Activity$/m);
    node_assert_1.strict.match(content, /- shipped v3 of agent memory/);
});
(0, node_test_1.test)("appendDailyBullet is a no-op when the bullet already exists", () => {
    const root = newRoot();
    (0, memory_update_js_1.appendDailyBullet)(root, "same bullet");
    const result = (0, memory_update_js_1.appendDailyBullet)(root, "same bullet");
    node_assert_1.strict.equal(result.action.kind, "noop");
});
(0, node_test_1.test)("addBullet rejects empty bullets", () => {
    const root = newRoot();
    node_assert_1.strict.throws(() => (0, memory_update_js_1.addBullet)({ root, file: "MEMORY.md", section: "Durable" }, ""), /non-empty/);
});
(0, node_test_1.test)("addBullet accepts long bullets without truncating", () => {
    const root = newRoot();
    const longText = "x".repeat(400);
    const result = (0, memory_update_js_1.addBullet)({ root, file: "MEMORY.md", section: "Durable" }, longText);
    node_assert_1.strict.equal(result.action.kind, "added");
    const content = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "MEMORY.md"), "utf8");
    node_assert_1.strict.match(content, new RegExp(`- ${longText}`));
});
//# sourceMappingURL=memory-update.test.js.map