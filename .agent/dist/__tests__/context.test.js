"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const context_js_1 = require("../context.js");
(0, node_test_1.test)("extractEventContext maps PR review comments to thread replies", () => {
    const ctx = (0, context_js_1.extractEventContext)("pull_request_review_comment", {
        comment: {
            id: 42,
            body: "fix the bug",
            html_url: "https://github.com/org/repo/pull/5#discussion_r42",
            node_id: "PRRC_42",
            user: { login: "alice" },
        },
        pull_request: {
            number: 5,
            html_url: "https://github.com/org/repo/pull/5",
        },
    });
    node_assert_1.strict.equal(ctx.sourceKind, "pull_request_review_comment");
    node_assert_1.strict.equal(ctx.targetKind, "pull_request");
    node_assert_1.strict.equal(ctx.targetNumber, "5");
    node_assert_1.strict.equal(ctx.responseKind, "review_comment_reply");
    node_assert_1.strict.equal(ctx.reviewCommentId, "42");
    node_assert_1.strict.equal(ctx.reactionSubjectId, "PRRC_42");
});
(0, node_test_1.test)("extractEventContext captures triggering PR issue comments", () => {
    const ctx = (0, context_js_1.extractEventContext)("issue_comment", {
        comment: {
            id: 99,
            body: "please review",
            html_url: "https://github.com/org/repo/issues/3#issuecomment-99",
            node_id: "IC_99",
        },
        issue: {
            number: 3,
            html_url: "https://github.com/org/repo/issues/3",
            pull_request: { url: "https://api.github.com/repos/org/repo/pulls/3" },
        },
    });
    node_assert_1.strict.equal(ctx.targetKind, "pull_request");
    node_assert_1.strict.equal(ctx.sourceKind, "issue_comment");
    node_assert_1.strict.equal(ctx.sourceCommentId, "99");
});
(0, node_test_1.test)("extractEventContext captures triggering PR reviews", () => {
    const ctx = (0, context_js_1.extractEventContext)("pull_request_review", {
        review: {
            id: 77,
            body: "looks good",
            html_url: "https://github.com/org/repo/pull/5#pullrequestreview-77",
            node_id: "PRR_77",
            user: { login: "bob" },
        },
        pull_request: {
            number: 5,
            html_url: "https://github.com/org/repo/pull/5",
        },
    });
    node_assert_1.strict.equal(ctx.sourceKind, "pull_request_review");
    node_assert_1.strict.equal(ctx.targetKind, "pull_request");
    node_assert_1.strict.equal(ctx.reactionSubjectId, "PRR_77");
});
(0, node_test_1.test)("extractEventContext maps discussion comments to discussion replies", () => {
    const ctx = (0, context_js_1.extractEventContext)("discussion_comment", {
        comment: {
            body: "interesting point",
            node_id: "DC_10",
        },
        discussion: {
            number: 1,
            html_url: "https://github.com/org/repo/discussions/1",
            node_id: "D_1",
        },
    });
    node_assert_1.strict.equal(ctx.targetKind, "discussion");
    node_assert_1.strict.equal(ctx.responseKind, "discussion_comment");
    node_assert_1.strict.equal(ctx.discussionNodeId, "D_1");
    node_assert_1.strict.equal(ctx.discussionCommentNodeId, "DC_10");
});
(0, node_test_1.test)("extractEventContext extracts discussionNodeId for discussion body mentions", () => {
    const ctx = (0, context_js_1.extractEventContext)("discussion", {
        discussion: {
            title: "Design",
            body: "content",
            number: 1,
            html_url: "https://github.com/org/repo/discussions/1",
            node_id: "D_1",
        },
    });
    node_assert_1.strict.equal(ctx.targetKind, "discussion");
    node_assert_1.strict.equal(ctx.discussionNodeId, "D_1");
    node_assert_1.strict.ok(ctx.body.includes("Design"));
});
(0, node_test_1.test)("getAuthorAssociation reads discussion associations", () => {
    node_assert_1.strict.equal((0, context_js_1.getAuthorAssociation)("discussion", {
        discussion: { authorAssociation: "MEMBER" },
    }), "MEMBER");
    node_assert_1.strict.equal((0, context_js_1.getAuthorAssociation)("discussion_comment", {
        comment: { author_association: "COLLABORATOR" },
    }), "COLLABORATOR");
});
(0, node_test_1.test)("getRequestedBy extracts login from various event types", () => {
    node_assert_1.strict.equal((0, context_js_1.getRequestedBy)("issue_comment", { comment: { user: { login: "alice" } } }), "alice");
    node_assert_1.strict.equal((0, context_js_1.getRequestedBy)("pull_request_review", { review: { user: { login: "bob" } } }), "bob");
    node_assert_1.strict.equal((0, context_js_1.getRequestedBy)("discussion", { discussion: { user: { login: "carol" } } }), "carol");
});
(0, node_test_1.test)("extractEventContext handles pull_request_target same as pull_request", () => {
    const payload = {
        pull_request: {
            number: 7,
            title: "feat: label triggers",
            body: "Add label-based activation",
            html_url: "https://github.com/org/repo/pull/7",
            node_id: "PR_7",
            author_association: "MEMBER",
            user: { login: "alice" },
        },
    };
    const ctx = (0, context_js_1.extractEventContext)("pull_request_target", payload);
    node_assert_1.strict.equal(ctx.sourceKind, "pull_request");
    node_assert_1.strict.equal(ctx.targetKind, "pull_request");
    node_assert_1.strict.equal(ctx.targetNumber, "7");
    node_assert_1.strict.equal(ctx.reactionSubjectId, "PR_7");
    node_assert_1.strict.ok(ctx.body.includes("label triggers"));
    node_assert_1.strict.equal((0, context_js_1.getAuthorAssociation)("pull_request_target", payload), "MEMBER");
    node_assert_1.strict.equal((0, context_js_1.getRequestedBy)("pull_request_target", payload), "alice");
});
(0, node_test_1.test)("shouldRespondToMention only triggers when an issue edit adds a mention", () => {
    node_assert_1.strict.equal((0, context_js_1.shouldRespondToMention)("issues", {
        action: "edited",
        issue: {
            title: "Need @sepo-agent",
            body: "body",
        },
        changes: {
            title: {
                from: "Need help",
            },
        },
    }, "@sepo-agent"), true);
    node_assert_1.strict.equal((0, context_js_1.shouldRespondToMention)("issues", {
        action: "edited",
        issue: {
            title: "Need @sepo-agent",
            body: "updated body",
        },
        changes: {
            body: {
                from: "body",
            },
        },
    }, "@sepo-agent"), false);
});
(0, node_test_1.test)("shouldRespondToMention only triggers when an edited comment adds a mention", () => {
    node_assert_1.strict.equal((0, context_js_1.shouldRespondToMention)("issue_comment", {
        action: "edited",
        comment: {
            body: "please check @sepo-agent",
        },
        changes: {
            body: {
                from: "please check",
            },
        },
    }, "@sepo-agent"), true);
    node_assert_1.strict.equal((0, context_js_1.shouldRespondToMention)("issue_comment", {
        action: "edited",
        comment: {
            body: "please check @sepo-agent again",
        },
        changes: {
            body: {
                from: "please check @sepo-agent",
            },
        },
    }, "@sepo-agent"), false);
    node_assert_1.strict.equal((0, context_js_1.shouldRespondToMention)("pull_request_review_comment", {
        action: "edited",
        comment: {
            body: "please check @sepo-agent",
        },
        changes: {
            body: {
                from: "please check",
            },
        },
    }, "@sepo-agent"), true);
});
(0, node_test_1.test)("shouldSkipSender filters bots", () => {
    node_assert_1.strict.ok((0, context_js_1.shouldSkipSender)({ sender: { type: "Bot", login: "dependabot[bot]" } }));
    node_assert_1.strict.ok((0, context_js_1.shouldSkipSender)({ sender: { type: "User", login: "github-actions" } }));
    node_assert_1.strict.ok(!(0, context_js_1.shouldSkipSender)({ sender: { type: "User", login: "alice" } }));
});
//# sourceMappingURL=context.test.js.map