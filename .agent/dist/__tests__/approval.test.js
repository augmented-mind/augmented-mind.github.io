"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const approval_js_1 = require("../approval.js");
(0, node_test_1.test)("approval marker round-trips through build and parse", () => {
    const data = { route: "implement", target_kind: "issue", target_number: 42 };
    const marker = (0, approval_js_1.buildApprovalRequestMarker)(data);
    const parsed = (0, approval_js_1.parseApprovalRequestMarker)(marker);
    node_assert_1.strict.deepEqual(parsed, data);
});
(0, node_test_1.test)("approval marker round-trips with request_text", () => {
    const data = {
        route: "implement",
        request_text: "please implement this feature",
        target_kind: "issue",
        target_number: 42,
    };
    const marker = (0, approval_js_1.buildApprovalRequestMarker)(data);
    const parsed = (0, approval_js_1.parseApprovalRequestMarker)(marker);
    node_assert_1.strict.equal(parsed?.request_text, "please implement this feature");
});
(0, node_test_1.test)("approval marker hides raw request text that contains HTML comment terminators", () => {
    const data = {
        route: "implement",
        request_text: "do this --> and keep -- dangerous sequences hidden",
        target_kind: "issue",
        target_number: 42,
    };
    const marker = (0, approval_js_1.buildApprovalRequestMarker)(data);
    const parsed = (0, approval_js_1.parseApprovalRequestMarker)(marker);
    node_assert_1.strict.ok(marker.startsWith("<!-- sepo-agent-request base64:"));
    node_assert_1.strict.doesNotMatch(marker, /do this/);
    node_assert_1.strict.equal(marker.match(/-->/g)?.length, 1);
    node_assert_1.strict.equal(parsed?.request_text, "do this --> and keep -- dangerous sequences hidden");
});
(0, node_test_1.test)("parseApprovalRequestMarker returns null for corrupted encoded markers", () => {
    node_assert_1.strict.equal((0, approval_js_1.parseApprovalRequestMarker)("<!-- sepo-agent-request base64:not-valid*** -->"), null);
    node_assert_1.strict.equal((0, approval_js_1.parseApprovalRequestMarker)("<!-- sepo-agent-request base64:bm90LWpzb24 -->"), null);
});
(0, node_test_1.test)("parseApprovalRequestMarker returns null for non-marker content", () => {
    node_assert_1.strict.equal((0, approval_js_1.parseApprovalRequestMarker)("just a regular comment"), null);
    node_assert_1.strict.equal((0, approval_js_1.parseApprovalRequestMarker)(""), null);
    node_assert_1.strict.equal((0, approval_js_1.parseApprovalRequestMarker)('<!-- sepo-agent-request {"route":"implement","request_text":"legacy"} -->'), null);
});
(0, node_test_1.test)("isApprovalCommand accepts only explicit mention slash-approve commands with ids", () => {
    node_assert_1.strict.ok((0, approval_js_1.isApprovalCommand)("@sepo-agent /approve req-a1b2c3"));
    node_assert_1.strict.ok(!(0, approval_js_1.isApprovalCommand)("/approve req-a1b2c3"));
    node_assert_1.strict.ok(!(0, approval_js_1.isApprovalCommand)("@sepo-agent approve req-a1b2c3"));
    node_assert_1.strict.ok(!(0, approval_js_1.isApprovalCommand)("Sure, @sepo-agent /approve this"));
    node_assert_1.strict.ok(!(0, approval_js_1.isApprovalCommand)("@sepo-agent review"));
    node_assert_1.strict.ok(!(0, approval_js_1.isApprovalCommand)("just a comment"));
});
(0, node_test_1.test)("parseApprovalCommand extracts the request id", () => {
    node_assert_1.strict.deepEqual((0, approval_js_1.parseApprovalCommand)("@sepo-agent /approve req-a1b2c3"), {
        requestId: "req-a1b2c3",
    });
    node_assert_1.strict.equal((0, approval_js_1.parseApprovalCommand)("@sepo-agent approve req-a1b2c3"), null);
    node_assert_1.strict.equal((0, approval_js_1.parseApprovalCommand)("@sepo-agent /approve"), null);
});
(0, node_test_1.test)("approval commands accept a configured mention", () => {
    const mention = "@custom/agent";
    node_assert_1.strict.ok((0, approval_js_1.isApprovalCommand)("@custom/agent /approve req-a1b2c3", mention));
    node_assert_1.strict.deepEqual((0, approval_js_1.parseApprovalCommand)("@custom/agent /approve req-a1b2c3", mention), {
        requestId: "req-a1b2c3",
    });
    node_assert_1.strict.equal((0, approval_js_1.isApprovalCommand)("@sepo-agent /approve req-a1b2c3", mention), false);
});
(0, node_test_1.test)("approval commands ignore fenced code blocks and quotes", () => {
    const body = [
        "Example:",
        "",
        "```text",
        "@sepo-agent /approve req-a1b2c3",
        "```",
        "",
        "> @sepo-agent /approve req-z9y8x7",
    ].join("\n");
    node_assert_1.strict.equal((0, approval_js_1.isApprovalCommand)(body), false);
    node_assert_1.strict.equal((0, approval_js_1.parseApprovalCommand)(body), null);
});
(0, node_test_1.test)("isApprovalRequestAlreadySatisfied detects the marker", () => {
    node_assert_1.strict.ok(!(0, approval_js_1.isApprovalRequestAlreadySatisfied)("pending request"));
    node_assert_1.strict.ok((0, approval_js_1.isApprovalRequestAlreadySatisfied)("body\n\n<!-- sepo-agent-approved -->"));
});
(0, node_test_1.test)("findPendingRequestById skips approved requests and matches exact ids", () => {
    const marker = (0, approval_js_1.buildApprovalRequestMarker)({ route: "implement", request_id: "req-old" });
    const comments = [
        {
            id: "1",
            body: `Request.\n\n${marker}\n\n<!-- sepo-agent-approved -->`,
            created_at: "2026-01-01T00:00:00Z",
        },
        {
            id: "2",
            body: `Another.\n\n${(0, approval_js_1.buildApprovalRequestMarker)({ route: "review", request_id: "req-new" })}`,
            created_at: "2026-01-02T00:00:00Z",
        },
    ];
    const result = (0, approval_js_1.findPendingRequestById)(comments, "req-new");
    node_assert_1.strict.ok(result);
    node_assert_1.strict.equal(result.comment.id, "2");
    node_assert_1.strict.equal(result.request.route, "review");
});
(0, node_test_1.test)("findPendingRequestById returns null when all matching ids are satisfied", () => {
    const marker = (0, approval_js_1.buildApprovalRequestMarker)({ route: "implement", request_id: "req-a1b2c3" });
    const comments = [
        {
            id: "1",
            body: `${marker}\n\n<!-- sepo-agent-approved -->`,
            created_at: "2026-01-01T00:00:00Z",
        },
    ];
    node_assert_1.strict.equal((0, approval_js_1.findPendingRequestById)(comments, "req-a1b2c3"), null);
});
(0, node_test_1.test)("findPendingRequestById returns null for empty list", () => {
    node_assert_1.strict.equal((0, approval_js_1.findPendingRequestById)([], "req-a1b2c3"), null);
});
(0, node_test_1.test)("isAgentApprovalComment detects request and satisfied markers", () => {
    const requestMarker = (0, approval_js_1.buildApprovalRequestMarker)({ route: "implement", request_id: "req-a1b2c3" });
    node_assert_1.strict.ok((0, approval_js_1.isAgentApprovalComment)(requestMarker));
    node_assert_1.strict.ok((0, approval_js_1.isAgentApprovalComment)("body\n\n<!-- sepo-agent-approved -->"));
    node_assert_1.strict.equal((0, approval_js_1.isAgentApprovalComment)("just a human approval reply"), false);
});
(0, node_test_1.test)("markApprovalRequestSatisfied renders table with full context", () => {
    const body = (0, approval_js_1.markApprovalRequestSatisfied)("original body", "alice", {
        route: "implement",
        workflow: "agent-implement.yml",
        issueUrl: "https://github.com/org/repo/issues/42",
        runUrl: "https://github.com/org/repo/actions/runs/123",
    });
    node_assert_1.strict.match(body, /@alice/);
    node_assert_1.strict.match(body, /implement/);
    node_assert_1.strict.match(body, /#42/);
    node_assert_1.strict.match(body, /approval run/);
    node_assert_1.strict.match(body, /sepo-agent-approved/);
});
(0, node_test_1.test)("markApprovalRequestSatisfied renders table without extra context", () => {
    const body = (0, approval_js_1.markApprovalRequestSatisfied)("body", "bob");
    node_assert_1.strict.match(body, /@bob/);
    node_assert_1.strict.match(body, /\u2014/); // em dash for missing tracking
    node_assert_1.strict.match(body, /sepo-agent-approved/);
});
(0, node_test_1.test)("shouldCreateIssueFromApprovalRequest only for non-issue implementation-like routes", () => {
    node_assert_1.strict.ok((0, approval_js_1.shouldCreateIssueFromApprovalRequest)({
        route: "implement",
        target_kind: "discussion",
        issue_title: "feat: add X",
    }));
    node_assert_1.strict.ok((0, approval_js_1.shouldCreateIssueFromApprovalRequest)({
        route: "create-action",
        target_kind: "discussion",
        issue_title: "Create scheduled action",
    }));
    node_assert_1.strict.ok(!(0, approval_js_1.shouldCreateIssueFromApprovalRequest)({
        route: "implement",
        target_kind: "issue",
        issue_title: "feat: add X",
    }));
    node_assert_1.strict.ok(!(0, approval_js_1.shouldCreateIssueFromApprovalRequest)({
        route: "review",
        target_kind: "pull_request",
        issue_title: "",
    }));
    node_assert_1.strict.ok(!(0, approval_js_1.shouldCreateIssueFromApprovalRequest)({
        route: "implement",
        target_kind: "discussion",
        issue_title: "",
    }));
});
//# sourceMappingURL=approval.test.js.map