"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const git_js_1 = require("../git.js");
(0, node_test_1.test)("buildPushToRefArgs pushes HEAD to the target ref", () => {
    node_assert_1.strict.deepEqual((0, git_js_1.buildPushToRefArgs)("https://example.com/repo.git", "feature"), ["push", "https://example.com/repo.git", "HEAD:feature"]);
});
(0, node_test_1.test)("buildPushToRefArgs includes a force-with-lease for branch updates", () => {
    node_assert_1.strict.deepEqual((0, git_js_1.buildPushToRefArgs)("https://example.com/repo.git", "feature", {
        forceWithLeaseOid: "abc123",
    }), [
        "push",
        "--force-with-lease=refs/heads/feature:abc123",
        "https://example.com/repo.git",
        "HEAD:feature",
    ]);
});
//# sourceMappingURL=git.test.js.map