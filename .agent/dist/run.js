"use strict";
// Agent adapter entrypoint.
//
// Reads a RuntimeEnvelope from environment variables, validates it, renders
// the prompt template (base + route), runs acpx directly, and outputs the
// result.
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const envelope_js_1 = require("./envelope.js");
const acpx_adapter_js_1 = require("./acpx-adapter.js");
const thread_state_js_1 = require("./thread-state.js");
const session_policy_js_1 = require("./session-policy.js");
const runtime_state_js_1 = require("./runtime-state.js");
const git_js_1 = require("./git.js");
const output_js_1 = require("./output.js");
// --- Logging ---
function log(level, msg, extra = {}) {
    const entry = { ts: new Date().toISOString(), level, msg, ...extra };
    process.stderr.write(JSON.stringify(entry) + "\n");
}
const SUPPLEMENTAL_PROMPT_VAR_NAMES = [
    "MEMORY_AVAILABLE",
    "MEMORY_DIR",
    "MEMORY_REF",
    "RUBRICS_AVAILABLE",
    "RUBRICS_DIR",
    "RUBRICS_REF",
    "RUBRICS_CONTEXT_FILE",
    "REQUEST_COMMENT_ID",
    "REQUEST_COMMENT_URL",
    "REQUEST_SOURCE_KIND",
    "REVIEWS_DIR",
    "CLAUDE_REVIEW_FILE",
    "CODEX_REVIEW_FILE",
    "ORCHESTRATOR_SOURCE_ACTION",
    "ORCHESTRATOR_SOURCE_CONCLUSION",
    "ORCHESTRATOR_SOURCE_RUN_ID",
    "ORCHESTRATOR_NEXT_TARGET_NUMBER",
    "ORCHESTRATOR_CONTEXT",
    "ORCHESTRATOR_CURRENT_ROUND",
    "ORCHESTRATOR_MAX_ROUNDS",
];
// --- Envelope from env ---
function envelopeFromEnv() {
    return (0, envelope_js_1.buildEnvelope)({
        repo_slug: process.env.REPO_SLUG || "",
        route: process.env.ROUTE || "",
        source_kind: process.env.SOURCE_KIND || "",
        target_kind: process.env.TARGET_KIND || "",
        target_number: Number(process.env.TARGET_NUMBER) || 0,
        target_url: process.env.TARGET_URL || "",
        request_text: process.env.REQUEST_TEXT || process.env.MENTION_BODY || "",
        requested_by: process.env.REQUESTED_BY || "",
        approval_comment_url: process.env.APPROVAL_COMMENT_URL || null,
        workflow: process.env.WORKFLOW || "",
        lane: process.env.LANE || "",
    });
}
// --- Prompt rendering ---
const BASE_PROMPT_PATH = ".github/prompts/_base.md";
const MEMORY_PROMPT_PATH = ".github/prompts/_memory.md";
const RUBRICS_PROMPT_PATH = ".github/prompts/_rubrics.md";
const PROMPT_TEMPLATES = {
    implement: ".github/prompts/agent-implement.md",
    review: ".github/prompts/review.md",
    "review-synthesize": ".github/prompts/review-synthesize.md",
    "review-synthesize-finalize": ".github/prompts/review-synthesize-finalize.md",
    "fix-pr": ".github/prompts/agent-fix-pr.md",
    answer: ".github/prompts/agent-answer.md",
    "create-action": ".github/prompts/agent-create-action.md",
    dispatch: ".github/prompts/agent-dispatch.md",
    "rubrics-review": ".github/prompts/rubrics-review.md",
    "rubrics-initialization": ".github/prompts/rubrics-initialization.md",
    "rubrics-update": ".github/prompts/rubrics-update.md",
    orchestrator: ".github/prompts/agent-orchestrator.md",
};
/**
 * Resolves the prompt template path from multiple sources:
 * 1. PROMPT_NAME env var → look up in PROMPT_TEMPLATES or .github/prompts/<name>.md
 * 2. SKILL_NAME env var → .skills/<name>/SKILL.md
 * 3. Fall back to route-based lookup in PROMPT_TEMPLATES
 */
function resolveTemplatePath(route, repoRoot) {
    const promptName = process.env.PROMPT_NAME?.trim();
    const skillName = process.env.SKILL_NAME?.trim();
    if (promptName) {
        // Named prompt: check PROMPT_TEMPLATES first, then .github/prompts/<name>.md
        if (PROMPT_TEMPLATES[promptName]) {
            const p = (0, node_path_1.join)(repoRoot, PROMPT_TEMPLATES[promptName]);
            if ((0, node_fs_1.existsSync)(p))
                return p;
        }
        const p = (0, node_path_1.join)(repoRoot, ".github", "prompts", `${promptName}.md`);
        if ((0, node_fs_1.existsSync)(p))
            return p;
        return null;
    }
    if (skillName) {
        // Named skill: .skills/<name>/SKILL.md
        const p = (0, node_path_1.join)(repoRoot, ".skills", skillName, "SKILL.md");
        if ((0, node_fs_1.existsSync)(p))
            return p;
        return null;
    }
    // Default: route-based lookup
    const relPath = PROMPT_TEMPLATES[route];
    if (!relPath)
        return null;
    const p = (0, node_path_1.join)(repoRoot, relPath);
    if ((0, node_fs_1.existsSync)(p))
        return p;
    return null;
}
function renderPrompt(templatePath, vars, repoRoot) {
    const basePath = (0, node_path_1.join)(repoRoot, BASE_PROMPT_PATH);
    const memoryPath = (0, node_path_1.join)(repoRoot, MEMORY_PROMPT_PATH);
    const rubricsPath = (0, node_path_1.join)(repoRoot, RUBRICS_PROMPT_PATH);
    let base = "";
    if ((0, node_fs_1.existsSync)(basePath)) {
        base = (0, node_fs_1.readFileSync)(basePath, "utf8") + "\n\n";
    }
    let memory = "";
    if (vars.MEMORY_AVAILABLE === "true" && (0, node_fs_1.existsSync)(memoryPath)) {
        memory = (0, node_fs_1.readFileSync)(memoryPath, "utf8") + "\n\n";
    }
    let rubrics = "";
    if (vars.RUBRICS_AVAILABLE === "true" && (0, node_fs_1.existsSync)(rubricsPath)) {
        rubrics = (0, node_fs_1.readFileSync)(rubricsPath, "utf8") + "\n\n";
    }
    const template = (0, node_fs_1.readFileSync)(templatePath, "utf8");
    const combined = base + memory + rubrics + template;
    return combined.replace(/\$\{(\w+)\}/g, (_match, key) => vars[key] ?? "");
}
// --- Helpers ---
const FAILURE_OUTPUT_TAIL_CHARS = 4000;
function sessionPolicyFromEnv() {
    const parsed = (0, session_policy_js_1.parseSessionPolicy)(process.env.SESSION_POLICY);
    if (!parsed) {
        throw new Error("Missing or invalid SESSION_POLICY (expected one of: none, track-only, resume-best-effort, resume-required)");
    }
    return parsed;
}
function buildThreadStateOptions(envelope) {
    const opts = { repo: envelope.repo_slug };
    if (process.env.INPUT_GITHUB_TOKEN) {
        opts.token = process.env.INPUT_GITHUB_TOKEN;
    }
    return opts;
}
function currentRunUrl() {
    const server = process.env.GITHUB_SERVER_URL;
    const repo = process.env.GITHUB_REPOSITORY;
    const runId = process.env.GITHUB_RUN_ID;
    if (!server || !repo || !runId) {
        return "";
    }
    return `${server}/${repo}/actions/runs/${runId}`;
}
function persistFailureOutputFile(runnerTemp, fileId, suffix, content) {
    const path = (0, node_path_1.join)(runnerTemp, `acpx-${suffix}-${fileId}.log`);
    (0, node_fs_1.writeFileSync)(path, content, "utf8");
    return path;
}
function persistFailureOutputs(runnerTemp, fileId, rawStdout, rawStderr) {
    let rawStdoutFile = "";
    let rawStderrFile = "";
    if (rawStdout) {
        rawStdoutFile = persistFailureOutputFile(runnerTemp, fileId, "stdout", rawStdout);
        (0, output_js_1.setOutput)("raw_stdout_file", rawStdoutFile);
    }
    if (rawStderr) {
        rawStderrFile = persistFailureOutputFile(runnerTemp, fileId, "stderr", rawStderr);
        (0, output_js_1.setOutput)("raw_stderr_file", rawStderrFile);
    }
    return { rawStdoutFile, rawStderrFile };
}
function buildSharedEnv() {
    const env = {};
    if (process.env.INPUT_GITHUB_TOKEN) {
        env.GH_TOKEN = process.env.INPUT_GITHUB_TOKEN;
        env.GITHUB_TOKEN = process.env.INPUT_GITHUB_TOKEN;
    }
    if (process.env.INPUT_OPENAI_API_KEY) {
        env.OPENAI_API_KEY = process.env.INPUT_OPENAI_API_KEY;
    }
    if (process.env.MODEL_REASONING_EFFORT) {
        env.MODEL_REASONING_EFFORT = process.env.MODEL_REASONING_EFFORT;
        // Claude Code reads effort from this env var directly, so both the
        // flow path and the direct path pick it up without session setup.
        env.CLAUDE_CODE_EFFORT_LEVEL = process.env.MODEL_REASONING_EFFORT;
    }
    if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
        env.CLAUDE_CODE_OAUTH_TOKEN = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    }
    return env;
}
// --- Main ---
function main() {
    const repoRoot = process.env.GITHUB_WORKSPACE || (0, node_path_1.resolve)(".");
    const agent = process.env.ACPX_AGENT;
    if (!agent) {
        log("error", "Missing required ACPX_AGENT");
        process.exitCode = 2;
        return;
    }
    // 1. Parse envelope
    const envelope = envelopeFromEnv();
    const errors = (0, envelope_js_1.validateEnvelope)(envelope);
    if (errors.length > 0) {
        log("error", "Envelope validation failed", { errors });
        process.exitCode = 2;
        return;
    }
    log("info", "Envelope parsed", {
        route: envelope.route,
        target: `${envelope.target_kind}#${envelope.target_number}`,
        thread_key: envelope.thread_key,
    });
    // 2. Resolve prompt template
    const templatePath = resolveTemplatePath(envelope.route, repoRoot);
    if (!templatePath) {
        const source = process.env.PROMPT_NAME || process.env.SKILL_NAME || envelope.route;
        log("error", `No prompt template found for: ${source}`);
        process.exitCode = 2;
        return;
    }
    // 3. Render prompt (base + route template)
    const promptVars = (0, envelope_js_1.envelopeToPromptVars)(envelope);
    // Supplemental prompt vars from env (route-specific, not part of RuntimeEnvelope).
    // Keep this contract explicit so workflows cannot inject arbitrary prompt
    // variables without updating the runtime allowlist here.
    for (const name of SUPPLEMENTAL_PROMPT_VAR_NAMES) {
        if (process.env[name])
            promptVars[name] = process.env[name];
    }
    if (promptVars.RUBRICS_CONTEXT_FILE && (0, node_fs_1.existsSync)(promptVars.RUBRICS_CONTEXT_FILE)) {
        promptVars.RUBRICS_CONTEXT = (0, node_fs_1.readFileSync)(promptVars.RUBRICS_CONTEXT_FILE, "utf8");
    }
    // Aliases for backward compat
    promptVars.PR_NUMBER = promptVars.TARGET_NUMBER;
    promptVars.GITHUB_REPOSITORY = promptVars.REPO_SLUG;
    const prompt = renderPrompt(templatePath, promptVars, repoRoot);
    const continuationPrompt = [
        "Trigger metadata:",
        `- Triggering source kind: \`${promptVars.REQUEST_SOURCE_KIND || ""}\``,
        `- Triggering comment/review ID: \`${promptVars.REQUEST_COMMENT_ID || ""}\``,
        `- Triggering comment/review URL: \`${promptVars.REQUEST_COMMENT_URL || ""}\``,
        "",
        promptVars.REQUEST_TEXT,
    ].join("\n");
    log("info", "Prompt rendered", {
        template: templatePath,
        prompt_length: prompt.length,
        continuation_prompt_length: continuationPrompt.length,
    });
    // 4. Preflight
    const check = (0, acpx_adapter_js_1.preflight)();
    if (!check.ok) {
        log("error", "Preflight failed: missing tools", { missing: check.missing });
        process.exitCode = 2;
        return;
    }
    // 5. Common setup
    (0, output_js_1.setOutput)("prompt", prompt);
    (0, output_js_1.setOutput)("thread_key", envelope.thread_key);
    (0, output_js_1.setOutput)("envelope_route", envelope.route);
    (0, output_js_1.setOutput)("raw_stdout_file", "");
    (0, output_js_1.setOutput)("raw_stderr_file", "");
    (0, output_js_1.setOutput)("resume_status", "not_attempted");
    (0, output_js_1.setOutput)("last_resume_error", "");
    (0, output_js_1.setOutput)("session_bundle_restore_status", process.env.SESSION_BUNDLE_RESTORE_STATUS || "not_attempted");
    (0, output_js_1.setOutput)("session_bundle_restore_error", process.env.SESSION_BUNDLE_RESTORE_ERROR || "");
    (0, output_js_1.setOutput)("session_fork_from_thread_key", process.env.SESSION_FORK_FROM_THREAD_KEY || "");
    (0, output_js_1.setOutput)("session_fork_restore_status", process.env.SESSION_FORK_RESTORE_STATUS || "not_attempted");
    (0, output_js_1.setOutput)("session_fork_restore_error", process.env.SESSION_FORK_RESTORE_ERROR || "");
    const runnerTemp = process.env.RUNNER_TEMP || "/tmp";
    const fileId = (0, node_crypto_1.randomBytes)(8).toString("hex");
    const sharedEnv = buildSharedEnv();
    const permissionMode = (0, acpx_adapter_js_1.parsePermissionModeOrSetDefault)(process.env.ACPX_PERMISSION_MODE);
    runDirectPath({
        agent, repoRoot, prompt, continuationPrompt, envelope, permissionMode,
        sharedEnv, runnerTemp, fileId,
    });
}
// --- Direct acpx execution path ---
function runDirectPath(opts) {
    const { agent, repoRoot, prompt, continuationPrompt, envelope, permissionMode, sharedEnv, runnerTemp, fileId, } = opts;
    let sessionPolicy;
    try {
        sessionPolicy = sessionPolicyFromEnv();
    }
    catch (err) {
        log("error", String(err), { route: envelope.route });
        process.exitCode = 2;
        return;
    }
    const trackThreadState = (0, session_policy_js_1.tracksThreadState)(sessionPolicy) && Boolean(envelope.thread_key);
    const threadStateOpts = buildThreadStateOptions(envelope);
    let threadState = null;
    let existingThreadState = null;
    let resumeSessionId;
    let forkResumeSessionId;
    let continuationPromptAllowed = false;
    const forkFromThreadKey = String(process.env.SESSION_FORK_FROM_THREAD_KEY || "").trim();
    const forkAcpxSessionId = String(process.env.SESSION_FORK_ACPX_SESSION_ID || "").trim();
    if (trackThreadState) {
        try {
            (0, git_js_1.configureBotIdentity)(repoRoot);
            existingThreadState = (0, thread_state_js_1.getThreadState)(envelope.thread_key, repoRoot, threadStateOpts);
            resumeSessionId = (0, runtime_state_js_1.resumeSessionIdFromState)(sessionPolicy, existingThreadState);
            continuationPromptAllowed = (0, runtime_state_js_1.shouldUseContinuationPrompt)(existingThreadState, resumeSessionId);
            forkResumeSessionId = (0, runtime_state_js_1.resumeSessionIdFromForkSource)(sessionPolicy, existingThreadState, forkAcpxSessionId);
            if (!resumeSessionId && forkResumeSessionId) {
                resumeSessionId = forkResumeSessionId;
                continuationPromptAllowed = false;
                log("info", "Using fork source session as resume seed", {
                    thread_key: envelope.thread_key,
                    forked_from_thread_key: forkFromThreadKey,
                    forked_from_acpx_session_id: forkAcpxSessionId,
                });
            }
            if (existingThreadState) {
                log("info", "Found existing thread state", {
                    thread_key: envelope.thread_key,
                    prior_status: existingThreadState.status,
                    prior_resume_status: existingThreadState.resume_status,
                    prior_attempt: existingThreadState.attempt_count,
                    session_policy: sessionPolicy,
                    resume_session_id: resumeSessionId ?? null,
                });
            }
            threadState = (0, thread_state_js_1.markThreadRunning)(envelope.thread_key, repoRoot, {
                last_run_url: currentRunUrl(),
                ...(0, runtime_state_js_1.buildRunningThreadStateFields)(),
                ...(forkResumeSessionId
                    ? {
                        forked_from_thread_key: forkFromThreadKey,
                        forked_from_acpx_session_id: forkAcpxSessionId,
                        bundle_restore_status: "restored_from_fork",
                        last_bundle_restore_error: "",
                    }
                    : {}),
            }, threadStateOpts);
            log("info", "Thread state marked running", {
                thread_key: envelope.thread_key,
                attempt: threadState.attempt_count,
                session_policy: sessionPolicy,
            });
            if ((0, runtime_state_js_1.shouldFailBecauseRequiredResumeIdentityMissing)(sessionPolicy, existingThreadState, resumeSessionId)) {
                const missingResumeError = "resume-required route has prior thread state but no acpxSessionId to resume";
                (0, output_js_1.setOutput)("resume_status", "failed");
                (0, output_js_1.setOutput)("last_resume_error", missingResumeError);
                const failedUpdates = (0, runtime_state_js_1.buildFailedThreadStateUpdates)({
                    kind: "failed",
                    error: missingResumeError,
                });
                (0, thread_state_js_1.markThreadFailed)(envelope.thread_key, threadState, repoRoot, failedUpdates, threadStateOpts);
                log("error", "Session continuity requirement not satisfied: prior thread state exists without resumable session identity", {
                    thread_key: envelope.thread_key,
                    session_policy: sessionPolicy,
                });
                process.exitCode = 1;
                return;
            }
        }
        catch (err) {
            if ((0, runtime_state_js_1.shouldFailRunBecauseOfThreadStateError)(sessionPolicy)) {
                log("error", "Failed to update thread state (pre-run)", {
                    error: String(err),
                    session_policy: sessionPolicy,
                });
                process.exitCode = 1;
                return;
            }
            log("warn", "Failed to update thread state (pre-run)", {
                error: String(err),
                session_policy: sessionPolicy,
            });
        }
    }
    log("info", "Running acpx", { agent, route: envelope.route, permission_mode: permissionMode });
    const result = (0, acpx_adapter_js_1.runAcpx)({
        agent,
        prompt,
        cwd: repoRoot,
        sessionMode: (0, session_policy_js_1.sessionModeForPolicy)(sessionPolicy),
        threadKey: envelope.thread_key,
        permissionMode,
        thoughtLevel: process.env.MODEL_REASONING_EFFORT,
        resumeSessionId,
        continuationPrompt: continuationPromptAllowed ? continuationPrompt : undefined,
        env: sharedEnv,
    });
    const resumeFields = (0, runtime_state_js_1.buildThreadStateFieldsFromEnsureOutcome)(result.sessionEnsureOutcome);
    (0, output_js_1.setOutput)("resume_status", resumeFields.resume_status);
    (0, output_js_1.setOutput)("last_resume_error", resumeFields.last_resume_error);
    log("info", "acpx completed", {
        exit_code: result.exitCode,
        session_name: result.sessionName,
        stdout_length: result.stdout.length,
        raw_stdout_length: result.rawStdout.length,
        stderr_length: result.stderr.length,
        session_log_length: result.sessionLog.length,
        session_ensure_outcome: result.sessionEnsureOutcome.kind,
    });
    // Display session activity in CI logs
    process.stderr.write("\n--- acpx session log ---\n");
    process.stderr.write((0, acpx_adapter_js_1.formatSessionLogForDisplay)(result.sessionLog) + "\n");
    process.stderr.write("--- end session log ---\n\n");
    // Save session log
    const sessionLogFile = (0, node_path_1.join)(runnerTemp, `acpx-session-${fileId}.jsonl`);
    (0, node_fs_1.writeFileSync)(sessionLogFile, result.sessionLog, "utf8");
    (0, output_js_1.setOutput)("session_log_file", sessionLogFile);
    log("info", "Session log saved", { session_log_file: sessionLogFile });
    // Save response
    const responseFile = (0, node_path_1.join)(runnerTemp, `acpx-response-${fileId}.md`);
    (0, node_fs_1.writeFileSync)(responseFile, result.stdout, "utf8");
    (0, output_js_1.setOutput)("response_file", responseFile);
    let identity = null;
    if (result.sessionName) {
        (0, output_js_1.setOutput)("session_name", result.sessionName);
        const identityResult = (0, acpx_adapter_js_1.readSessionIdentityResult)(agent, result.sessionName, repoRoot);
        identity = identityResult.identity;
        if (identity) {
            (0, output_js_1.setOutput)("acpx_record_id", identity.acpxRecordId);
            (0, output_js_1.setOutput)("acpx_session_id", identity.acpxSessionId);
            log("info", "Session identity", {
                acpx_record_id: identity.acpxRecordId,
                acpx_session_id: identity.acpxSessionId,
            });
        }
        else {
            log("warn", "Session identity could not be read", {
                session_name: result.sessionName,
                error: identityResult.error,
            });
        }
    }
    if (trackThreadState && threadState) {
        try {
            if (result.exitCode !== 0) {
                const failedUpdates = (0, runtime_state_js_1.buildFailedThreadStateUpdates)(result.sessionEnsureOutcome);
                (0, thread_state_js_1.markThreadFailed)(envelope.thread_key, threadState, repoRoot, failedUpdates, threadStateOpts);
                log("info", "Thread state marked failed", {
                    thread_key: envelope.thread_key,
                    resume_status: failedUpdates.resume_status,
                });
            }
            else {
                const updates = (0, runtime_state_js_1.buildCompletedThreadStateUpdates)({
                    outcome: result.sessionEnsureOutcome,
                    identity: identity ?? null,
                });
                (0, thread_state_js_1.markThreadCompleted)(envelope.thread_key, threadState, repoRoot, updates, threadStateOpts);
                log("info", "Thread state marked completed", {
                    thread_key: envelope.thread_key,
                    resume_status: updates.resume_status,
                });
            }
        }
        catch (err) {
            if ((0, runtime_state_js_1.shouldFailRunBecauseOfThreadStateError)(sessionPolicy)) {
                log("error", "Failed to update thread state (post-run)", {
                    error: String(err),
                    session_policy: sessionPolicy,
                });
                process.exitCode = 1;
            }
            else {
                log("warn", "Failed to update thread state (post-run)", {
                    error: String(err),
                    session_policy: sessionPolicy,
                });
            }
        }
    }
    if ((0, runtime_state_js_1.shouldFailRunBecauseOfEnsureOutcome)(sessionPolicy, result.sessionEnsureOutcome)) {
        log("error", "Session continuity requirement not satisfied", {
            thread_key: envelope.thread_key,
            session_policy: sessionPolicy,
            outcome: result.sessionEnsureOutcome,
            prior_session_id: existingThreadState?.acpxSessionId || null,
        });
        process.exitCode = 1;
    }
    if (result.exitCode !== 0) {
        const { rawStdoutFile, rawStderrFile } = persistFailureOutputs(runnerTemp, fileId, result.rawStdout, result.stderr);
        log("error", "acpx run failed", {
            raw_stdout_file: rawStdoutFile || undefined,
            raw_stderr_file: rawStderrFile || undefined,
            raw_stdout_tail: (0, acpx_adapter_js_1.tailForLog)(result.rawStdout, FAILURE_OUTPUT_TAIL_CHARS),
            stderr_tail: (0, acpx_adapter_js_1.tailForLog)(result.stderr, FAILURE_OUTPUT_TAIL_CHARS),
        });
        process.exitCode = 1;
    }
}
main();
//# sourceMappingURL=run.js.map