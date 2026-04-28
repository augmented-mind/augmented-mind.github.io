"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const discussion_transcript_js_1 = require("../discussion-transcript.js");
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
(0, node_test_1.test)("buildDiscussionTranscript includes discussion metadata and nested replies", () => {
    const transcript = (0, discussion_transcript_js_1.buildDiscussionTranscript)({
        id: "discussion-1",
        title: "Discussion title",
        url: "https://github.com/self-evolving/repo/discussions/1",
        author: "alice",
        body: "Discussion body",
    }, [
        {
            id: "comment-1",
            author: "bob",
            createdAt: "2026-03-30T00:00:00Z",
            body: "Top-level comment",
            replyToId: "",
            replies: [
                {
                    id: "reply-1",
                    author: "carol",
                    createdAt: "2026-03-30T01:00:00Z",
                    body: "Thread reply",
                    replyToId: "comment-1",
                },
            ],
        },
    ]);
    node_assert_1.strict.match(transcript, /Title: Discussion title/);
    node_assert_1.strict.match(transcript, /### Comment by bob/);
    node_assert_1.strict.match(transcript, /#### Reply by carol/);
    node_assert_1.strict.match(transcript, /Thread reply/);
});
(0, node_test_1.test)("buildDiscussionTranscript renders an empty comment section explicitly", () => {
    const transcript = (0, discussion_transcript_js_1.buildDiscussionTranscript)({
        id: "discussion-2",
        title: "No comments yet",
        url: "https://github.com/self-evolving/repo/discussions/2",
        author: "alice",
        body: "Discussion body",
    }, []);
    node_assert_1.strict.match(transcript, /## Comments/);
    node_assert_1.strict.match(transcript, /_No comments yet\._/);
});
(0, node_test_1.test)("formatDiscussionTranscriptComment uses ghost fallback and reply headings", () => {
    const formatted = (0, discussion_transcript_js_1.formatDiscussionTranscriptComment)({
        id: "reply-1",
        body: "Nested reply",
        createdAt: "",
        author: "",
        replyToId: "comment-1",
    }, 1);
    node_assert_1.strict.match(formatted, /#### Reply by ghost at /);
    node_assert_1.strict.match(formatted, /Nested reply/);
});
(0, node_test_1.test)("fetchDiscussionTranscript paginates top-level comments and reply threads", async () => {
    const { client, calls } = createQueuedClient([
        {
            repository: {
                discussion: {
                    id: "discussion-1",
                    title: "Discussion title",
                    url: "https://github.com/self-evolving/repo/discussions/1",
                    body: "Discussion body",
                    author: { login: "alice" },
                    comments: {
                        nodes: [
                            {
                                id: "comment-1",
                                body: "First comment",
                                createdAt: "2026-03-30T00:00:00Z",
                                author: { login: "bob" },
                                replyTo: null,
                                replies: {
                                    nodes: [
                                        {
                                            id: "reply-1",
                                            body: "First reply",
                                            createdAt: "2026-03-30T00:05:00Z",
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
                            createdAt: "2026-03-30T00:10:00Z",
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
                    id: "discussion-1",
                    title: "Discussion title",
                    url: "https://github.com/self-evolving/repo/discussions/1",
                    body: "Discussion body",
                    author: { login: "alice" },
                    comments: {
                        nodes: [
                            {
                                id: "comment-2",
                                body: "Second comment",
                                createdAt: "2026-03-30T01:00:00Z",
                                author: { login: "erin" },
                                replyTo: null,
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
    const result = await (0, discussion_transcript_js_1.fetchDiscussionTranscript)(client, "self-evolving", "repo", 1);
    node_assert_1.strict.equal(result.discussionMeta.id, "discussion-1");
    node_assert_1.strict.equal(result.comments.length, 2);
    node_assert_1.strict.equal(result.comments[0].id, "comment-1");
    node_assert_1.strict.equal(result.comments[0].replies.length, 2);
    node_assert_1.strict.equal(result.comments[0].replies[1].id, "reply-2");
    node_assert_1.strict.equal(result.comments[1].id, "comment-2");
    node_assert_1.strict.equal(calls.length, 3);
    node_assert_1.strict.equal(calls[0].variables.number, 1);
    node_assert_1.strict.equal(calls[0].variables.after, undefined);
    node_assert_1.strict.equal(calls[1].variables.commentId, "comment-1");
    node_assert_1.strict.equal(calls[1].variables.after, "reply-cursor-1");
    node_assert_1.strict.equal(calls[2].variables.after, "comment-cursor-1");
});
(0, node_test_1.test)("fetchDiscussionTranscript throws when the discussion cannot be found", () => {
    const { client } = createQueuedClient([
        {
            repository: {
                discussion: null,
            },
        },
    ]);
    let message = "";
    try {
        (0, discussion_transcript_js_1.fetchDiscussionTranscript)(client, "self-evolving", "repo", 404);
    }
    catch (error) {
        message = error instanceof Error ? error.message : String(error);
    }
    node_assert_1.strict.equal(message, "Discussion #404 not found");
});
//# sourceMappingURL=discussion-transcript.test.js.map