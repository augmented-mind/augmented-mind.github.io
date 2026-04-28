"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const sync_github_artifacts_js_1 = require("../cli/memory/sync-github-artifacts.js");
function createQueuedClient(responses) {
    const calls = [];
    const client = {
        graphql(query, variables) {
            calls.push({ query, variables: { ...variables } });
            if (responses.length === 0) {
                throw new Error("Unexpected GraphQL call");
            }
            return responses.shift();
        },
    };
    return { client, calls };
}
(0, node_test_1.test)("buildGhApiPagedArgs forces GET for REST list parameters", () => {
    node_assert_1.strict.deepEqual((0, sync_github_artifacts_js_1.buildGhApiPagedArgs)("repos/self-evolving/repo/issues", [
        ["-f", "state=all"],
        ["-F", "per_page=100"],
    ]), [
        "api",
        "--method",
        "GET",
        "--paginate",
        "--slurp",
        "repos/self-evolving/repo/issues",
        "-f",
        "state=all",
        "-F",
        "per_page=100",
    ]);
});
(0, node_test_1.test)("fetchDiscussions skips listing when repository discussions are disabled", () => {
    const { client, calls } = createQueuedClient([
        {
            repository: {
                hasDiscussionsEnabled: false,
            },
        },
    ]);
    const discussions = (0, sync_github_artifacts_js_1.fetchDiscussions)(client, "self-evolving", "repo", "2026-04-20T00:00:00Z");
    node_assert_1.strict.deepEqual(discussions, []);
    node_assert_1.strict.equal(calls.length, 1);
    node_assert_1.strict.match(calls[0]?.query || "", /hasDiscussionsEnabled/);
});
(0, node_test_1.test)("fetchDiscussionDetail paginates top-level comments and nested replies", () => {
    const { client, calls } = createQueuedClient([
        {
            repository: {
                discussion: {
                    number: 7,
                    title: "Discussion title",
                    url: "https://github.com/self-evolving/repo/discussions/7",
                    body: "Discussion body",
                    createdAt: "2026-04-20T00:00:00Z",
                    updatedAt: "2026-04-21T00:00:00Z",
                    author: { login: "alice" },
                    category: { name: "Ideas" },
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "First comment",
                                createdAt: "2026-04-20T01:00:00Z",
                                url: "https://github.com/self-evolving/repo/discussions/7#discussioncomment-1",
                                author: { login: "bob" },
                                replies: {
                                    nodes: [
                                        {
                                            id: "reply-1",
                                            body: "First reply",
                                            createdAt: "2026-04-20T01:05:00Z",
                                            url: "https://github.com/self-evolving/repo/discussions/7#discussioncomment-2",
                                            author: { login: "carol" },
                                            replyTo: { id: "comment-1" },
                                        },
                                    ],
                                    pageInfo: {
                                        hasNextPage: true,
                                        endCursor: "reply-cursor-1",
                                    },
                                },
                            },
                        ],
                        pageInfo: {
                            hasNextPage: true,
                            endCursor: "comment-cursor-1",
                        },
                    },
                },
            },
        },
        {
            node: {
                replies: {
                    nodes: [
                        {
                            id: "reply-2",
                            body: "Second reply",
                            createdAt: "2026-04-20T01:10:00Z",
                            url: "https://github.com/self-evolving/repo/discussions/7#discussioncomment-3",
                            author: { login: "dave" },
                            replyTo: { id: "comment-1" },
                        },
                    ],
                    pageInfo: {
                        hasNextPage: false,
                        endCursor: null,
                    },
                },
            },
        },
        {
            repository: {
                discussion: {
                    number: 7,
                    title: "Discussion title",
                    url: "https://github.com/self-evolving/repo/discussions/7",
                    body: "Discussion body",
                    createdAt: "2026-04-20T00:00:00Z",
                    updatedAt: "2026-04-21T00:00:00Z",
                    author: { login: "alice" },
                    category: { name: "Ideas" },
                    comments: {
                        nodes: [
                            {
                                id: "comment-2",
                                body: "Second comment",
                                createdAt: "2026-04-20T02:00:00Z",
                                url: "https://github.com/self-evolving/repo/discussions/7#discussioncomment-4",
                                author: { login: "erin" },
                                replies: {
                                    nodes: [],
                                    pageInfo: {
                                        hasNextPage: false,
                                        endCursor: null,
                                    },
                                },
                            },
                        ],
                        pageInfo: {
                            hasNextPage: false,
                            endCursor: null,
                        },
                    },
                },
            },
        },
    ]);
    const detail = (0, sync_github_artifacts_js_1.fetchDiscussionDetail)(client, "self-evolving", "repo", 7);
    node_assert_1.strict.equal(detail.number, 7);
    node_assert_1.strict.equal(detail.comments.nodes.length, 2);
    node_assert_1.strict.equal(detail.comments.nodes[0]?.id, "comment-1");
    node_assert_1.strict.equal(detail.comments.nodes[0]?.replies.nodes.length, 2);
    node_assert_1.strict.equal(detail.comments.nodes[0]?.replies.nodes[1]?.id, "reply-2");
    node_assert_1.strict.equal(detail.comments.nodes[1]?.id, "comment-2");
    node_assert_1.strict.deepEqual(detail.comments.pageInfo, {
        hasNextPage: false,
        endCursor: null,
    });
    node_assert_1.strict.equal(calls.length, 3);
    node_assert_1.strict.equal(calls[0]?.variables.n, 7);
    node_assert_1.strict.equal(calls[0]?.variables.after, undefined);
    node_assert_1.strict.equal(calls[1]?.variables.commentId, "comment-1");
    node_assert_1.strict.equal(calls[1]?.variables.after, "reply-cursor-1");
    node_assert_1.strict.equal(calls[2]?.variables.after, "comment-cursor-1");
});
//# sourceMappingURL=memory-sync-github-artifacts.test.js.map