"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const discussion_js_1 = require("../discussion.js");
function queuedClient(responses) {
    const calls = [];
    const client = {
        graphql(query, variables) {
            calls.push({ query, variables: { ...variables } });
            if (responses.length === 0)
                throw new Error("Unexpected GraphQL call");
            return responses.shift();
        },
    };
    return { client, calls };
}
(0, node_test_1.test)("fetchRepositoryDiscussionConfig paginates categories", () => {
    const { client, calls } = queuedClient([
        {
            repository: {
                id: "repo-1",
                hasDiscussionsEnabled: true,
                discussionCategories: {
                    nodes: [{ id: "cat-1", name: "General" }],
                    pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
                },
            },
        },
        {
            repository: {
                id: "repo-1",
                hasDiscussionsEnabled: true,
                discussionCategories: {
                    nodes: [{ id: "cat-2", name: "Daily Summaries" }],
                    pageInfo: { hasNextPage: false, endCursor: null },
                },
            },
        },
    ]);
    const config = (0, discussion_js_1.fetchRepositoryDiscussionConfig)(client, "self-evolving", "repo");
    node_assert_1.strict.equal(config.repositoryId, "repo-1");
    node_assert_1.strict.equal(config.hasDiscussionsEnabled, true);
    node_assert_1.strict.deepEqual(config.categories, [
        { id: "cat-1", name: "General" },
        { id: "cat-2", name: "Daily Summaries" },
    ]);
    node_assert_1.strict.equal(calls.length, 2);
    node_assert_1.strict.equal(calls[0]?.variables.cursor, undefined);
    node_assert_1.strict.equal(calls[1]?.variables.cursor, "cursor-1");
});
(0, node_test_1.test)("requireDiscussionCategory validates discussion configuration", () => {
    node_assert_1.strict.throws(() => (0, discussion_js_1.requireDiscussionCategory)({
        repositoryId: "repo-1",
        hasDiscussionsEnabled: false,
        categories: [],
    }, "Daily Summaries"), /discussions are not enabled/);
    node_assert_1.strict.throws(() => (0, discussion_js_1.requireDiscussionCategory)({
        repositoryId: "repo-1",
        hasDiscussionsEnabled: true,
        categories: [{ id: "cat-1", name: "General" }],
    }, "Daily Summaries"), /Required discussion category 'Daily Summaries' was not found/);
});
(0, node_test_1.test)("createDiscussion returns the created discussion URL", () => {
    const { client, calls } = queuedClient([
        { createDiscussion: { discussion: { url: "https://github.com/org/repo/discussions/1" } } },
    ]);
    const discussion = (0, discussion_js_1.createDiscussion)(client, "repo-1", "cat-1", "Daily Summary", "Body");
    node_assert_1.strict.equal(discussion.url, "https://github.com/org/repo/discussions/1");
    node_assert_1.strict.equal(calls.length, 1);
    node_assert_1.strict.match(calls[0]?.query || "", /createDiscussion/);
});
(0, node_test_1.test)("createRepositoryDiscussion composes config lookup and creation", () => {
    const { client, calls } = queuedClient([
        {
            repository: {
                id: "repo-1",
                hasDiscussionsEnabled: true,
                discussionCategories: {
                    nodes: [{ id: "cat-1", name: "Daily Summaries" }],
                    pageInfo: { hasNextPage: false, endCursor: null },
                },
            },
        },
        { createDiscussion: { discussion: { url: "https://github.com/org/repo/discussions/2" } } },
    ]);
    const discussion = (0, discussion_js_1.createRepositoryDiscussion)("org", "repo", "Daily Summaries", "Daily Summary", "Body", client);
    node_assert_1.strict.equal(discussion.url, "https://github.com/org/repo/discussions/2");
    node_assert_1.strict.equal(calls.length, 2);
});
//# sourceMappingURL=discussion.test.js.map