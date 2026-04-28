"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const fetch_discussion_transcript_js_1 = require("../cli/fetch-discussion-transcript.js");
function createBufferWriter() {
    let output = "";
    return {
        writer: {
            write(chunk) {
                output += chunk;
            },
        },
        read() {
            return output;
        },
    };
}
(0, node_test_1.test)("parseDiscussionNumber accepts positive integers only", () => {
    node_assert_1.strict.equal((0, fetch_discussion_transcript_js_1.parseDiscussionNumber)("12"), 12);
    node_assert_1.strict.equal((0, fetch_discussion_transcript_js_1.parseDiscussionNumber)("0"), null);
    node_assert_1.strict.equal((0, fetch_discussion_transcript_js_1.parseDiscussionNumber)("-3"), null);
    node_assert_1.strict.equal((0, fetch_discussion_transcript_js_1.parseDiscussionNumber)("abc"), null);
    node_assert_1.strict.equal((0, fetch_discussion_transcript_js_1.parseDiscussionNumber)(undefined), null);
});
(0, node_test_1.test)("resolveRepoSlug prefers REPO_SLUG from env", () => {
    let called = false;
    const repoSlug = (0, fetch_discussion_transcript_js_1.resolveRepoSlug)({
        env: { REPO_SLUG: "self-evolving/repo" },
        execGh() {
            called = true;
            throw new Error("should not execute gh");
        },
    });
    node_assert_1.strict.equal(repoSlug, "self-evolving/repo");
    node_assert_1.strict.equal(called, false);
});
(0, node_test_1.test)("resolveRepoSlug falls back to gh repo view", () => {
    const repoSlug = (0, fetch_discussion_transcript_js_1.resolveRepoSlug)({
        env: {},
        execGh() {
            return Buffer.from("self-evolving/repo\n", "utf8");
        },
    });
    node_assert_1.strict.equal(repoSlug, "self-evolving/repo");
});
(0, node_test_1.test)("runFetchDiscussionTranscriptCli prints usage for missing or invalid numbers", () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();
    const exitCode = (0, fetch_discussion_transcript_js_1.runFetchDiscussionTranscriptCli)([], {
        stdout: stdout.writer,
        stderr: stderr.writer,
    });
    node_assert_1.strict.equal(exitCode, 1);
    node_assert_1.strict.equal(stdout.read(), "");
    node_assert_1.strict.match(stderr.read(), /Usage: fetch-discussion-transcript\.js/);
});
(0, node_test_1.test)("runFetchDiscussionTranscriptCli reports repository resolution failures", () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();
    const exitCode = (0, fetch_discussion_transcript_js_1.runFetchDiscussionTranscriptCli)(["12"], {
        env: {},
        stdout: stdout.writer,
        stderr: stderr.writer,
        resolveRepoSlug() {
            return "";
        },
    });
    node_assert_1.strict.equal(exitCode, 1);
    node_assert_1.strict.equal(stdout.read(), "");
    node_assert_1.strict.match(stderr.read(), /Could not determine repository/);
});
(0, node_test_1.test)("runFetchDiscussionTranscriptCli renders the transcript on success", () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();
    let receivedOwner = "";
    let receivedRepo = "";
    let receivedNumber = 0;
    const exitCode = (0, fetch_discussion_transcript_js_1.runFetchDiscussionTranscriptCli)(["12"], {
        env: { REPO_SLUG: "self-evolving/repo" },
        stdout: stdout.writer,
        stderr: stderr.writer,
        createClient() {
            return {
                graphql() {
                    throw new Error("not used by test fetcher");
                },
            };
        },
        fetchDiscussionTranscript(_client, owner, repo, number) {
            receivedOwner = owner;
            receivedRepo = repo;
            receivedNumber = number;
            return {
                discussionMeta: {
                    id: "discussion-12",
                    title: "Title",
                    url: "https://github.com/self-evolving/repo/discussions/12",
                    body: "Body",
                    author: "alice",
                },
                comments: [],
            };
        },
        buildDiscussionTranscript(discussionMeta) {
            return `Transcript for ${discussionMeta.title}\n`;
        },
    });
    node_assert_1.strict.equal(exitCode, 0);
    node_assert_1.strict.equal(receivedOwner, "self-evolving");
    node_assert_1.strict.equal(receivedRepo, "repo");
    node_assert_1.strict.equal(receivedNumber, 12);
    node_assert_1.strict.equal(stdout.read(), "Transcript for Title\n");
    node_assert_1.strict.equal(stderr.read(), "");
});
(0, node_test_1.test)("runFetchDiscussionTranscriptCli reports fetch failures to stderr", () => {
    const stdout = createBufferWriter();
    const stderr = createBufferWriter();
    const exitCode = (0, fetch_discussion_transcript_js_1.runFetchDiscussionTranscriptCli)(["12"], {
        env: { REPO_SLUG: "self-evolving/repo" },
        stdout: stdout.writer,
        stderr: stderr.writer,
        createClient() {
            return {
                graphql() {
                    throw new Error("not used by failing test");
                },
            };
        },
        fetchDiscussionTranscript() {
            throw new Error("Discussion #12 not found");
        },
    });
    node_assert_1.strict.equal(exitCode, 1);
    node_assert_1.strict.equal(stdout.read(), "");
    node_assert_1.strict.match(stderr.read(), /Discussion #12 not found/);
});
//# sourceMappingURL=fetch-discussion-transcript-cli.test.js.map