"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const review_summary_minimize_js_1 = require("../review-summary-minimize.js");
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
(0, node_test_1.test)("collapsePreviousReviewSummaries minimizes visible generated summaries", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\nold",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "comment-2",
                                body: "## AI Review Synthesis\nalready collapsed",
                                isMinimized: true,
                                author: { login: "sepo-agent" },
                            },
                            {
                                id: "comment-3",
                                body: "## AI Review Synthesis\nother author",
                                isMinimized: false,
                                author: { login: "alice" },
                            },
                            {
                                id: "comment-4",
                                body: "Regular discussion",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    reviews: {
                        nodes: [
                            {
                                id: "review-1",
                                body: "\n## AI Review Synthesis\nold review",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    const collapsed = (0, review_summary_minimize_js_1.collapsePreviousReviewSummaries)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    });
    node_assert_1.strict.equal(collapsed, 2);
    node_assert_1.strict.equal(calls.length, 5);
    node_assert_1.strict.match(calls[1]?.query || "", /comments/);
    node_assert_1.strict.deepEqual(calls[1]?.variables, {
        owner: "self-evolving",
        name: "repo",
        number: 320,
        after: undefined,
    });
    node_assert_1.strict.match(calls[2]?.query || "", /reviews/);
    node_assert_1.strict.deepEqual(calls.slice(3).map((call) => call.variables), [
        { id: "comment-1", classifier: "OUTDATED" },
        { id: "review-1", classifier: "OUTDATED" },
    ]);
});
(0, node_test_1.test)("collapsePreviousReviewSummaries matches GitHub App bot login variants", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent-app[bot]" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "## AI Review Synthesis\n\n<!-- sepo-agent-review-synthesis -->\nold",
                                isMinimized: false,
                                author: { login: "sepo-agent-app" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    reviews: {
                        nodes: [],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    node_assert_1.strict.equal((0, review_summary_minimize_js_1.collapsePreviousReviewSummaries)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    }), 1);
    node_assert_1.strict.deepEqual(calls[3]?.variables, { id: "comment-1", classifier: "OUTDATED" });
});
(0, node_test_1.test)("collapsePreviousReviewSummaries keeps heading fallback for markerless summaries", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "## AI Review Synthesis\nold markerless comment",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    reviews: {
                        nodes: [],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    node_assert_1.strict.equal((0, review_summary_minimize_js_1.collapsePreviousReviewSummaries)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    }), 1);
    node_assert_1.strict.deepEqual(calls[3]?.variables, { id: "comment-1", classifier: "OUTDATED" });
});
(0, node_test_1.test)("collapsePreviousReviewSummaries paginates comments", () => {
    const { client, calls } = createQueuedClient([
        { viewer: { login: "sepo-agent" } },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [],
                        pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "## AI Review Synthesis\nold",
                                isMinimized: false,
                                author: { login: "sepo-agent" },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        {
            repository: {
                pullRequest: {
                    reviews: {
                        nodes: [],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            },
        },
        { minimizeComment: { minimizedComment: { isMinimized: true } } },
    ]);
    node_assert_1.strict.equal((0, review_summary_minimize_js_1.collapsePreviousReviewSummaries)({
        repo: "self-evolving/repo",
        prNumber: 320,
        client,
    }), 1);
    node_assert_1.strict.equal(calls[1]?.variables.after, undefined);
    node_assert_1.strict.equal(calls[2]?.variables.after, "cursor-1");
});
//# sourceMappingURL=review-summary-minimize.test.js.map