"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const acpx_adapter_js_1 = require("../acpx-adapter.js");
(0, node_test_1.test)("buildAcpxArgs puts global flags before the agent token for exec routes", () => {
    const args = (0, acpx_adapter_js_1.buildAcpxArgs)({
        agent: "codex",
        prompt: "review this change",
        permissionMode: "approve-reads",
        timeout: 90,
        isExecRoute: true,
    });
    node_assert_1.strict.deepEqual(args, [
        "--approve-reads",
        "--format",
        "json",
        "--json-strict",
        "--suppress-reads",
        "--timeout",
        "90",
        "codex",
        "exec",
        "review this change",
    ]);
});
(0, node_test_1.test)("buildAcpxArgs uses prompt mode with a named session for persistent routes", () => {
    const args = (0, acpx_adapter_js_1.buildAcpxArgs)({
        agent: "claude",
        prompt: "apply the requested fix",
        permissionMode: "approve-all",
        sessionName: "pull_request-38-fix-pr-default",
        isExecRoute: false,
    });
    node_assert_1.strict.deepEqual(args, [
        "--approve-all",
        "--format",
        "json",
        "--json-strict",
        "--suppress-reads",
        "claude",
        "prompt",
        "-s",
        "pull_request-38-fix-pr-default",
        "apply the requested fix",
    ]);
});
(0, node_test_1.test)("selectPromptForSessionOutcome uses continuation only after successful resume", () => {
    node_assert_1.strict.equal((0, acpx_adapter_js_1.selectPromptForSessionOutcome)({
        fullPrompt: "full route prompt",
        continuationPrompt: "latest request only",
        outcome: { kind: "resumed", resumedFromSessionId: "ses-123" },
    }), "latest request only");
    node_assert_1.strict.equal((0, acpx_adapter_js_1.selectPromptForSessionOutcome)({
        fullPrompt: "full route prompt",
        continuationPrompt: "latest request only",
        outcome: { kind: "resume_fallback", resumedFromSessionId: "ses-123", error: "expired" },
    }), "full route prompt");
    node_assert_1.strict.equal((0, acpx_adapter_js_1.selectPromptForSessionOutcome)({
        fullPrompt: "full route prompt",
        continuationPrompt: "latest request only",
        outcome: { kind: "fresh" },
    }), "full route prompt");
});
(0, node_test_1.test)("selectPromptForSessionOutcome falls back to full prompt without continuation", () => {
    node_assert_1.strict.equal((0, acpx_adapter_js_1.selectPromptForSessionOutcome)({
        fullPrompt: "full route prompt",
        outcome: { kind: "resumed", resumedFromSessionId: "ses-123" },
    }), "full route prompt");
});
(0, node_test_1.test)("buildSessionSetupCommands configures thought level and full-access mode for persistent sessions", () => {
    const commands = (0, acpx_adapter_js_1.buildSessionSetupCommands)({
        agent: "codex",
        sessionName: "issue-24-implement-default",
        thoughtLevel: "xhigh",
        permissionMode: "approve-all",
    });
    node_assert_1.strict.deepEqual(commands, [
        {
            label: "set thought_level",
            args: ["codex", "set", "-s", "issue-24-implement-default", "thought_level", "xhigh"],
        },
        {
            label: "set-mode",
            args: ["codex", "set-mode", "-s", "issue-24-implement-default", "full-access"],
        },
    ]);
});
(0, node_test_1.test)("buildSessionSetupCommands sets full-access mode for all persistent sessions", () => {
    const commands = (0, acpx_adapter_js_1.buildSessionSetupCommands)({
        agent: "codex",
        sessionName: "pull_request-38-review-default",
        thoughtLevel: "high",
        permissionMode: "approve-all",
    });
    node_assert_1.strict.deepEqual(commands, [
        {
            label: "set thought_level",
            args: ["codex", "set", "-s", "pull_request-38-review-default", "thought_level", "high"],
        },
        {
            label: "set-mode",
            args: ["codex", "set-mode", "-s", "pull_request-38-review-default", "full-access"],
        },
    ]);
});
(0, node_test_1.test)("buildSessionSetupCommands does nothing without a session and ignores blank thought level", () => {
    node_assert_1.strict.deepEqual((0, acpx_adapter_js_1.buildSessionSetupCommands)({
        agent: "codex",
        sessionName: undefined,
        thoughtLevel: "xhigh",
        permissionMode: "approve-all",
    }), []);
    node_assert_1.strict.deepEqual((0, acpx_adapter_js_1.buildSessionSetupCommands)({
        agent: "codex",
        sessionName: "issue-24-answer-default",
        thoughtLevel: "   ",
        permissionMode: "approve-all",
    }), [
        {
            label: "set-mode",
            args: ["codex", "set-mode", "-s", "issue-24-answer-default", "full-access"],
        },
    ]);
});
(0, node_test_1.test)("buildSessionSetupCommands maps claude approve-all to bypassPermissions only", () => {
    const commands = (0, acpx_adapter_js_1.buildSessionSetupCommands)({
        agent: "claude",
        sessionName: "pull_request-81-review-default",
        thoughtLevel: "max",
        permissionMode: "approve-all",
    });
    node_assert_1.strict.deepEqual(commands, [
        {
            label: "set-mode",
            args: ["claude", "set-mode", "-s", "pull_request-81-review-default", "bypassPermissions"],
        },
    ]);
});
(0, node_test_1.test)("buildSessionSetupCommands skips claude setup when not approve-all", () => {
    const commands = (0, acpx_adapter_js_1.buildSessionSetupCommands)({
        agent: "claude",
        sessionName: "pull_request-81-review-default",
        thoughtLevel: "max",
        permissionMode: "approve-reads",
    });
    node_assert_1.strict.deepEqual(commands, []);
});
(0, node_test_1.test)("extractAssistantText returns the last message from a compacted log", () => {
    const log = [
        '{"type":"message","text":"Checking the repo."}',
        '{"type":"tool_call","name":"shell","status":"completed"}',
        '{"type":"message","text":"The answer is four."}',
        '{"type":"done","stopReason":"end_turn"}',
    ].join("\n");
    node_assert_1.strict.equal((0, acpx_adapter_js_1.extractAssistantText)(log), "The answer is four.");
});
(0, node_test_1.test)("extractAssistantText returns empty string when no messages exist", () => {
    const log = '{"type":"done","stopReason":"end_turn"}';
    node_assert_1.strict.equal((0, acpx_adapter_js_1.extractAssistantText)(log), "");
});
(0, node_test_1.test)("tailForLog leaves short values unchanged", () => {
    node_assert_1.strict.equal((0, acpx_adapter_js_1.tailForLog)("hello", 10), "hello");
});
(0, node_test_1.test)("tailForLog keeps the end of long values with a truncation marker", () => {
    const value = "abcdefghijklmnopqrstuvwxyz";
    node_assert_1.strict.equal((0, acpx_adapter_js_1.tailForLog)(value, 10), "[truncated 16 chars]\nqrstuvwxyz");
});
(0, node_test_1.test)("runCommandWithFileCapture captures large stdout without a maxBuffer cap", () => {
    const size = 2 * 1024 * 1024;
    const result = (0, acpx_adapter_js_1.runCommandWithFileCapture)({
        command: process.execPath,
        args: ["-e", `process.stdout.write("x".repeat(${size}))`],
        cwd: process.cwd(),
    });
    node_assert_1.strict.equal(result.exitCode, 0);
    node_assert_1.strict.equal(result.stderr, "");
    node_assert_1.strict.equal(result.stdout.length, size);
    node_assert_1.strict.equal(result.stdout, "x".repeat(size));
});
(0, node_test_1.test)("runCommandWithFileCapture captures stderr and failing exit codes", () => {
    const result = (0, acpx_adapter_js_1.runCommandWithFileCapture)({
        command: process.execPath,
        args: ["-e", 'process.stderr.write("oops\\n"); process.exit(7);'],
        cwd: process.cwd(),
    });
    node_assert_1.strict.equal(result.exitCode, 7);
    node_assert_1.strict.equal(result.stdout, "");
    node_assert_1.strict.equal(result.stderr, "oops\n");
});
(0, node_test_1.test)("runCommandWithFileCapture treats signal-terminated processes as failures", () => {
    const result = (0, acpx_adapter_js_1.runCommandWithFileCapture)({
        command: process.execPath,
        args: ["-e", 'process.kill(process.pid, "SIGTERM")'],
        cwd: process.cwd(),
    });
    node_assert_1.strict.equal(result.exitCode, 1);
});
(0, node_test_1.test)("compactSessionLog merges tokens and keeps structured events", () => {
    const ndjson = [
        '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{}}',
        '{"jsonrpc":"2.0","id":0,"result":{"protocolVersion":1,"agentCapabilities":{}}}',
        '{"jsonrpc":"2.0","id":1,"method":"session/new","params":{}}',
        '{"jsonrpc":"2.0","id":1,"result":{"sessionId":"sess-123","models":{"currentModelId":"gpt-5.4/xhigh"}}}',
        '{"jsonrpc":"2.0","method":"session/update","params":{"update":{"sessionUpdate":"available_commands_update"}}}',
        '{"jsonrpc":"2.0","method":"session/update","params":{"update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"Check"}}}}',
        '{"jsonrpc":"2.0","method":"session/update","params":{"update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"ing."}}}}',
        '{"jsonrpc":"2.0","method":"session/update","params":{"update":{"sessionUpdate":"tool_call","name":"shell","status":"running"}}}',
        '{"jsonrpc":"2.0","method":"session/update","params":{"update":{"sessionUpdate":"tool_call_update","name":"shell","status":"completed"}}}',
        '{"jsonrpc":"2.0","method":"session/update","params":{"update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"Done."}}}}',
        '{"jsonrpc":"2.0","method":"session/update","params":{"update":{"sessionUpdate":"usage_update","used":5000,"size":100000}}}',
        '{"jsonrpc":"2.0","id":2,"result":{"stopReason":"end_turn"}}',
    ].join("\n");
    const lines = (0, acpx_adapter_js_1.compactSessionLog)(ndjson).trim().split("\n").map((l) => JSON.parse(l));
    node_assert_1.strict.deepEqual(lines, [
        { type: "session", sessionId: "sess-123", model: "gpt-5.4/xhigh" },
        { type: "message", text: "Checking." },
        { type: "tool_call", name: "shell", status: "running" },
        { type: "tool_call_update", name: "shell", status: "completed" },
        { type: "message", text: "Done." },
        { type: "usage", used: 5000, size: 100000 },
        { type: "done", stopReason: "end_turn" },
    ]);
});
(0, node_test_1.test)("parseSessionIdentity reads canonical acpx json output", () => {
    const identity = (0, acpx_adapter_js_1.parseSessionIdentity)(JSON.stringify({
        acpxRecordId: "record-123",
        acpSessionId: "session-456",
        agentSessionId: "inner-789",
    }));
    node_assert_1.strict.deepEqual(identity, {
        acpxRecordId: "record-123",
        acpxSessionId: "session-456",
    });
});
(0, node_test_1.test)("parseSessionIdentity reads alias fields from acpx metadata", () => {
    node_assert_1.strict.deepEqual((0, acpx_adapter_js_1.parseSessionIdentity)(JSON.stringify({ recordId: "record-123", sessionId: "session-456" })), {
        acpxRecordId: "record-123",
        acpxSessionId: "session-456",
    });
    node_assert_1.strict.deepEqual((0, acpx_adapter_js_1.parseSessionIdentity)(JSON.stringify({ acpxRecordId: "record-123", acpxSessionId: "session-456" })), {
        acpxRecordId: "record-123",
        acpxSessionId: "session-456",
    });
});
(0, node_test_1.test)("readSessionIdentityResult streams large acpx metadata through file capture", () => {
    const dir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "acpx-identity-test-"));
    const oldPath = process.env.PATH;
    try {
        const acpxPath = (0, node_path_1.join)(dir, "acpx");
        (0, node_fs_1.writeFileSync)(acpxPath, `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ acpxRecordId: "record-123", acpSessionId: "session-456", messages: "x".repeat(2 * 1024 * 1024) }));\n`, "utf8");
        (0, node_fs_1.chmodSync)(acpxPath, 0o755);
        process.env.PATH = `${dir}${node_path_1.delimiter}${oldPath || ""}`;
        const result = (0, acpx_adapter_js_1.readSessionIdentityResult)("codex", "session-name", process.cwd());
        node_assert_1.strict.deepEqual(result, {
            identity: {
                acpxRecordId: "record-123",
                acpxSessionId: "session-456",
            },
            error: "",
        });
    }
    finally {
        if (oldPath === undefined) {
            delete process.env.PATH;
        }
        else {
            process.env.PATH = oldPath;
        }
        (0, node_fs_1.rmSync)(dir, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("parseSessionIdentity returns null for incomplete payloads", () => {
    node_assert_1.strict.equal((0, acpx_adapter_js_1.parseSessionIdentity)(JSON.stringify({ acpxRecordId: "record-only" })), null);
    node_assert_1.strict.equal((0, acpx_adapter_js_1.parseSessionIdentity)("unknown: data"), null);
});
(0, node_test_1.test)("sessionNameFromThreadKey drops the repo prefix and keeps route identity", () => {
    node_assert_1.strict.equal((0, acpx_adapter_js_1.sessionNameFromThreadKey)("self-evolving/repo:pull_request:38:fix-pr:default"), "pull_request-38-fix-pr-default");
});
//# sourceMappingURL=acpx-adapter.test.js.map