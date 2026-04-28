"use strict";
// Thin acpx adapter.
//
// Wraps acpx CLI calls with: preflight checks, session naming via
// `sessions ensure`, identity reconciliation, per-route permission mode,
// and output mode selection.
//
// Resume policy:
// - session mode is explicit (`exec` or `persistent`)
// - workflows provide `session_policy`; the adapter does not hard-code routes
// - the adapter reports whether the session was resumed, freshly created,
//   fell back to fresh after resume failure, or failed before the run.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommandWithFileCapture = runCommandWithFileCapture;
exports.preflight = preflight;
exports.sessionNameFromThreadKey = sessionNameFromThreadKey;
exports.buildAcpxArgs = buildAcpxArgs;
exports.parsePermissionModeOrSetDefault = parsePermissionModeOrSetDefault;
exports.selectPromptForSessionOutcome = selectPromptForSessionOutcome;
exports.buildSessionSetupCommands = buildSessionSetupCommands;
exports.parseSessionIdentity = parseSessionIdentity;
exports.extractAssistantText = extractAssistantText;
exports.compactSessionLog = compactSessionLog;
exports.formatSessionLogForDisplay = formatSessionLogForDisplay;
exports.tailForLog = tailForLog;
exports.runAcpx = runAcpx;
exports.readSessionIdentityResult = readSessionIdentityResult;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
// --- Route configuration ---
/** Default persistent session mode for agents that support Codex-style modes. */
const PERSISTENT_SESSION_MODE = "full-access";
const CLAUDE_BYPASS_MODE = "bypassPermissions";
const DEFAULT_PERMISSION_MODE = "approve-all";
const ACPX_MAX_BUFFER = 50 * 1024 * 1024; // 50 MB
/**
 * Runs a command synchronously while streaming stdout/stderr to temp files.
 *
 * This avoids the `execFileSync` maxBuffer cap for large agent/tool output,
 * but still returns the captured text to the caller after the process exits.
 */
function runCommandWithFileCapture(options) {
    const captureDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "acpx-capture-"));
    const stdoutPath = (0, node_path_1.join)(captureDir, "stdout.log");
    const stderrPath = (0, node_path_1.join)(captureDir, "stderr.log");
    let stdoutFd = null;
    let stderrFd = null;
    try {
        stdoutFd = (0, node_fs_1.openSync)(stdoutPath, "w");
        stderrFd = (0, node_fs_1.openSync)(stderrPath, "w");
        const result = (0, node_child_process_1.spawnSync)(options.command, options.args, {
            cwd: options.cwd,
            env: options.env,
            stdio: ["ignore", stdoutFd, stderrFd],
            timeout: options.timeout ? options.timeout * 1000 : undefined,
        });
        (0, node_fs_1.closeSync)(stdoutFd);
        stdoutFd = null;
        (0, node_fs_1.closeSync)(stderrFd);
        stderrFd = null;
        let stderr = (0, node_fs_1.readFileSync)(stderrPath, "utf8");
        const stdout = (0, node_fs_1.readFileSync)(stdoutPath, "utf8");
        if (result.error) {
            const errorMessage = result.error.message || String(result.error);
            stderr = stderr ? `${stderr}\n${errorMessage}` : errorMessage;
        }
        return {
            exitCode: typeof result.status === "number"
                ? result.status
                : result.error || result.signal
                    ? 1
                    : 0,
            stdout,
            stderr,
        };
    }
    finally {
        if (stdoutFd !== null) {
            try {
                (0, node_fs_1.closeSync)(stdoutFd);
            }
            catch {
                // Already closed.
            }
        }
        if (stderrFd !== null) {
            try {
                (0, node_fs_1.closeSync)(stderrFd);
            }
            catch {
                // Already closed.
            }
        }
        (0, node_fs_1.rmSync)(captureDir, { recursive: true, force: true });
    }
}
// --- Preflight ---
function commandExists(cmd) {
    try {
        (0, node_child_process_1.execFileSync)("command", ["-v", cmd], { stdio: "pipe", shell: true });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Verifies that required tools are available on the runner.
 */
function preflight() {
    const required = ["acpx", "gh", "git"];
    const missing = required.filter((cmd) => !commandExists(cmd));
    return { ok: missing.length === 0, missing };
}
// --- Session naming ---
/**
 * Converts a thread key into a safe acpx session name.
 * acpx session names should be short, filesystem-safe identifiers.
 */
function sessionNameFromThreadKey(threadKey) {
    // thread_key format: repo:target_kind:target_number:route:lane
    // session name: target_kind-target_number-route-lane
    const parts = threadKey.split(":");
    if (parts.length >= 5) {
        return parts.slice(1).join("-");
    }
    return threadKey.replace(/[/:]/g, "-");
}
function buildAcpxArgs(options) {
    const args = [];
    // acpx requires global flags before the agent token.
    args.push(`--${options.permissionMode}`);
    args.push("--format", "json", "--json-strict");
    args.push("--suppress-reads");
    if (options.timeout) {
        args.push("--timeout", String(options.timeout));
    }
    args.push(options.agent);
    if (options.isExecRoute || !options.sessionName) {
        args.push("exec");
    }
    else {
        args.push("prompt", "-s", options.sessionName);
    }
    args.push(options.prompt);
    return args;
}
function parsePermissionModeOrSetDefault(value) {
    const v = value?.trim();
    if (v === "approve-all" || v === "approve-reads" || v === "deny-all") {
        return v;
    }
    return DEFAULT_PERMISSION_MODE;
}
function selectPromptForSessionOutcome(options) {
    if (options.outcome.kind === "resumed" && options.continuationPrompt) {
        return options.continuationPrompt;
    }
    return options.fullPrompt;
}
function buildSessionSetupCommands(options) {
    if (!options.sessionName) {
        return [];
    }
    const normalizedAgent = options.agent.trim().toLowerCase();
    if (normalizedAgent === "claude") {
        if (options.permissionMode === "approve-all") {
            return [
                {
                    label: "set-mode",
                    args: [options.agent, "set-mode", "-s", options.sessionName, CLAUDE_BYPASS_MODE],
                },
            ];
        }
        return [];
    }
    const commands = [];
    const thoughtLevel = options.thoughtLevel?.trim();
    if (thoughtLevel) {
        commands.push({
            label: "set thought_level",
            args: [options.agent, "set", "-s", options.sessionName, "thought_level", thoughtLevel],
        });
    }
    commands.push({
        label: "set-mode",
        args: [options.agent, "set-mode", "-s", options.sessionName, PERSISTENT_SESSION_MODE],
    });
    return commands;
}
function parseSessionIdentity(raw) {
    try {
        const data = JSON.parse(raw);
        const acpxRecordId = typeof data.acpxRecordId === "string"
            ? data.acpxRecordId
            : typeof data.recordId === "string"
                ? data.recordId
                : "";
        const acpxSessionId = typeof data.acpSessionId === "string"
            ? data.acpSessionId
            : typeof data.acpxSessionId === "string"
                ? data.acpxSessionId
                : typeof data.sessionId === "string"
                    ? data.sessionId
                    : "";
        if (!acpxRecordId || !acpxSessionId) {
            return null;
        }
        return { acpxRecordId, acpxSessionId };
    }
    catch {
        return null;
    }
}
/**
 * Ensures a named session exists via `acpx <agent> sessions ensure`.
 *
 * When `resumeSessionId` is provided, first attempts to resume that ACP
 * session. If resume fails (expired session, new runner, etc.), falls back
 * to creating a fresh session under the same name.
 *
 * Returns a structured outcome so the runtime can distinguish:
 * - resumed successfully
 * - resumed failed, fresh fallback used
 * - no resume attempted
 * - failed before the run
 */
function ensureSession(agent, sessionName, cwd, env, resumeSessionId) {
    if (resumeSessionId) {
        try {
            (0, node_child_process_1.execFileSync)("acpx", [agent, "sessions", "ensure", "--name", sessionName, "--resume-session", resumeSessionId], {
                cwd,
                env,
                stdio: "pipe",
                maxBuffer: ACPX_MAX_BUFFER,
            });
            return { kind: "resumed", resumedFromSessionId: resumeSessionId };
        }
        catch (err) {
            const resumeError = err?.stderr?.toString("utf8") ?? String(err);
            try {
                (0, node_child_process_1.execFileSync)("acpx", [agent, "sessions", "ensure", "--name", sessionName], {
                    cwd,
                    env,
                    stdio: "pipe",
                    maxBuffer: ACPX_MAX_BUFFER,
                });
                return {
                    kind: "resume_fallback",
                    resumedFromSessionId: resumeSessionId,
                    error: resumeError,
                };
            }
            catch (freshErr) {
                const freshError = freshErr?.stderr?.toString("utf8") ?? String(freshErr);
                return {
                    kind: "failed",
                    resumedFromSessionId: resumeSessionId,
                    error: `resume failed: ${resumeError}\nfresh ensure failed: ${freshError}`,
                };
            }
        }
    }
    try {
        (0, node_child_process_1.execFileSync)("acpx", [agent, "sessions", "ensure", "--name", sessionName], {
            cwd,
            env,
            stdio: "pipe",
            maxBuffer: ACPX_MAX_BUFFER,
        });
        return { kind: "fresh" };
    }
    catch (err) {
        const error = err?.stderr?.toString("utf8") ?? String(err);
        return { kind: "failed", error };
    }
}
// --- NDJSON parsing ---
/**
 * Extracts the final assistant message from a compacted session log.
 * Returns the last `message` entry — reasoning traces are in the JSONL.
 */
function extractAssistantText(compactedLog) {
    let lastMessage = "";
    for (const line of compactedLog.split("\n")) {
        if (!line.trim())
            continue;
        try {
            const entry = JSON.parse(line);
            if (entry.type === "message" && entry.text) {
                lastMessage = entry.text;
            }
        }
        catch {
            // skip
        }
    }
    return lastMessage;
}
/**
 * Compacts raw acpx NDJSON into a clean session log.
 *
 * - Merges streaming `agent_message_chunk` tokens into one entry per turn
 * - Keeps tool_call events (with name/status)
 * - Keeps usage_update events
 * - Extracts session metadata from the verbose init/session payloads
 * - Drops everything else (protocol handshake, model lists, etc.)
 */
function compactSessionLog(ndjson) {
    const entries = [];
    let currentText = "";
    let sessionId = "";
    function flushText() {
        if (currentText) {
            entries.push(JSON.stringify({ type: "message", text: currentText }));
            currentText = "";
        }
    }
    for (const line of ndjson.split("\n")) {
        if (!line.trim())
            continue;
        try {
            const event = JSON.parse(line);
            // Extract sessionId from session/new response
            const result = event.result;
            if (result?.sessionId && !sessionId) {
                sessionId = String(result.sessionId);
                const models = result.models;
                entries.push(JSON.stringify({
                    type: "session",
                    sessionId,
                    model: models?.currentModelId ?? null,
                }));
                continue;
            }
            const update = event.params
                ?.update;
            if (!update?.sessionUpdate)
                continue;
            const updateType = update.sessionUpdate;
            if (updateType === "agent_message_chunk") {
                const content = update.content;
                if (content?.type === "text" && content.text) {
                    currentText += String(content.text);
                }
            }
            else if (updateType === "tool_call" || updateType === "tool_call_update") {
                flushText();
                entries.push(JSON.stringify({
                    type: updateType,
                    name: update.name ?? update.title ?? null,
                    status: update.status ?? null,
                }));
            }
            else if (updateType === "usage_update") {
                flushText();
                entries.push(JSON.stringify({
                    type: "usage",
                    used: update.used ?? null,
                    size: update.size ?? null,
                }));
            }
        }
        catch {
            // Preserve unparseable lines so schema drift doesn't silently vanish
            entries.push(JSON.stringify({ type: "parse_error", raw: line.slice(0, 500) }));
        }
    }
    flushText();
    // Append stop reason from final RPC response
    const lastLine = ndjson.trimEnd().split("\n").pop();
    if (lastLine) {
        try {
            const last = JSON.parse(lastLine);
            const lastResult = last.result;
            if (lastResult?.stopReason) {
                entries.push(JSON.stringify({ type: "done", stopReason: lastResult.stopReason }));
            }
        }
        catch { /* skip */ }
    }
    return entries.join("\n") + "\n";
}
const SESSION_LOG_MAX_MESSAGE_CHARS = 2000;
/**
 * Formats a compacted session log for human-readable display in CI logs.
 * Message text is truncated to SESSION_LOG_MAX_MESSAGE_CHARS per entry.
 */
function formatSessionLogForDisplay(sessionLog) {
    const lines = [];
    for (const raw of sessionLog.split("\n")) {
        if (!raw.trim())
            continue;
        try {
            const entry = JSON.parse(raw);
            switch (entry.type) {
                case "session":
                    lines.push(`[session] ${entry.model ?? "unknown"} ${entry.sessionId ?? ""}`);
                    break;
                case "message": {
                    const text = String(entry.text || "");
                    const display = text.length > SESSION_LOG_MAX_MESSAGE_CHARS
                        ? text.slice(0, SESSION_LOG_MAX_MESSAGE_CHARS) + `... (${text.length} chars)`
                        : text;
                    lines.push(`[message] ${display}`);
                    break;
                }
                case "tool_call":
                    lines.push(`[tool]    ${entry.name ?? "unknown"} (${entry.status ?? "?"})`);
                    break;
                case "tool_call_update":
                    if (entry.status) {
                        lines.push(`[tool]    ${entry.name ?? "  ↳"} (${entry.status})`);
                    }
                    break;
                case "usage":
                    lines.push(`[usage]   ${entry.used ?? "?"} tokens`);
                    break;
                case "done":
                    lines.push(`[done]    ${entry.stopReason ?? "unknown"}`);
                    break;
                case "parse_error":
                    lines.push(`[warn]    unparseable line: ${String(entry.raw ?? "").slice(0, 200)}`);
                    break;
                default:
                    break;
            }
        }
        catch {
            // skip
        }
    }
    return lines.join("\n");
}
function tailForLog(value, maxChars) {
    if (value.length <= maxChars) {
        return value;
    }
    return `[truncated ${value.length - maxChars} chars]\n${value.slice(-maxChars)}`;
}
// --- Runner ---
/**
 * Runs an acpx prompt and returns the result.
 *
 * CLI argv ordering: acpx [global-flags] <agent> <subcommand> [subcommand-args] [prompt]
 */
function runAcpx(options) {
    const { agent, prompt, continuationPrompt, cwd, sessionMode, threadKey, timeout, thoughtLevel, resumeSessionId, env: extraEnv, } = options;
    const permissionMode = options.permissionMode ?? DEFAULT_PERMISSION_MODE;
    const isExecRoute = sessionMode === "exec";
    const env = { ...process.env, ...extraEnv };
    let sessionName;
    let sessionEnsureOutcome = { kind: "not_applicable" };
    if (isExecRoute || !threadKey) {
        sessionName = undefined;
    }
    else {
        // Persistent lane: ensure session exists first
        sessionName = sessionNameFromThreadKey(threadKey);
        sessionEnsureOutcome = ensureSession(agent, sessionName, cwd, env, resumeSessionId);
        if (sessionEnsureOutcome.kind === "failed") {
            return {
                exitCode: 1,
                stdout: "",
                rawStdout: "",
                stderr: `session setup failed: ${sessionEnsureOutcome.error}`,
                sessionLog: "",
                sessionName,
                sessionEnsureOutcome,
            };
        }
        try {
            for (const command of buildSessionSetupCommands({
                agent,
                sessionName,
                thoughtLevel,
                permissionMode,
            })) {
                (0, node_child_process_1.execFileSync)("acpx", command.args, {
                    cwd,
                    env,
                    stdio: ["pipe", "pipe", "pipe"],
                    maxBuffer: ACPX_MAX_BUFFER,
                });
            }
        }
        catch (err) {
            const error = err;
            const stderr = error.stderr?.toString("utf8") ?? String(err);
            return {
                exitCode: error.status ?? 1,
                stdout: "",
                rawStdout: "",
                stderr: `session setup failed: ${stderr}`,
                sessionLog: "",
                sessionName,
                sessionEnsureOutcome,
            };
        }
    }
    const args = buildAcpxArgs({
        agent,
        prompt: selectPromptForSessionOutcome({
            fullPrompt: prompt,
            continuationPrompt,
            outcome: sessionEnsureOutcome,
        }),
        permissionMode,
        timeout,
        sessionName,
        isExecRoute,
    });
    const result = runCommandWithFileCapture({
        command: "acpx",
        args,
        cwd,
        env,
        timeout,
    });
    const sessionLog = compactSessionLog(result.stdout);
    const stdout = extractAssistantText(sessionLog);
    return {
        exitCode: result.exitCode,
        stdout,
        rawStdout: result.stdout,
        stderr: result.stderr,
        sessionLog,
        sessionName,
        sessionEnsureOutcome,
    };
}
/**
 * Reads session metadata after a run to extract identity fields.
 * Returns acpxRecordId and acpxSessionId if available.
 */
function readSessionIdentityResult(agent, sessionName, cwd) {
    try {
        const result = runCommandWithFileCapture({
            command: "acpx",
            args: ["--format", "json", agent, "sessions", "show", sessionName],
            cwd,
        });
        if (result.exitCode !== 0) {
            return {
                identity: null,
                error: result.stderr.trim() || `acpx sessions show exited with code ${result.exitCode}`,
            };
        }
        const identity = parseSessionIdentity(result.stdout);
        if (!identity) {
            return {
                identity: null,
                error: "acpx session metadata did not include acpxRecordId and acpxSessionId",
            };
        }
        return { identity, error: "" };
    }
    catch (err) {
        return { identity: null, error: err instanceof Error ? err.message : String(err) };
    }
}
//# sourceMappingURL=acpx-adapter.js.map