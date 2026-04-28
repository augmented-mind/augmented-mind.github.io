"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCursorActivity = resolveCursorActivity;
exports.fetchJsonState = fetchJsonState;
exports.writeJsonState = writeJsonState;
exports.resolveScheduledActivityGate = resolveScheduledActivityGate;
const git_js_1 = require("./git.js");
const schedule_policy_js_1 = require("./schedule-policy.js");
const STATE_FILENAME = "state.json";
const REF_NOT_FOUND_PATTERN = /couldn't find remote ref|no matching remote head/i;
function resolveRemoteTarget(remote, opts) {
    if (opts?.token && opts?.repo)
        return (0, git_js_1.buildAuthUrl)(opts.token, opts.repo);
    return remote;
}
function readField(record, field) {
    if (!record || typeof record !== "object" || !field)
        return "";
    const value = record[field];
    return typeof value === "string" ? value : "";
}
function parseTime(value) {
    if (!value)
        return null;
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
}
function resolveCursorActivity(mode, dependencyValue, selfValue) {
    const dependencyTime = parseTime(dependencyValue);
    const selfTime = parseTime(selfValue);
    if (dependencyTime === null || selfTime === null) {
        return {
            mode,
            skip: false,
            reason: "missing or invalid activity cursor",
            dependencyValue,
            selfValue,
        };
    }
    if (dependencyTime <= selfTime) {
        return {
            mode,
            skip: true,
            reason: "dependency cursor has not advanced",
            dependencyValue,
            selfValue,
        };
    }
    return {
        mode,
        skip: false,
        reason: "dependency cursor advanced",
        dependencyValue,
        selfValue,
    };
}
function fetchJsonState(ref, cwd, opts) {
    const origin = opts?.remote ?? "origin";
    const fetchTarget = resolveRemoteTarget(origin, opts);
    try {
        (0, git_js_1.git)(["fetch", "--no-tags", fetchTarget, `+${ref}:${ref}`], cwd);
    }
    catch (err) {
        const stderr = err?.stderr?.toString("utf8") ?? String(err);
        if (REF_NOT_FOUND_PATTERN.test(stderr))
            return null;
        throw err;
    }
    try {
        const json = (0, git_js_1.git)(["cat-file", "blob", `${ref}:${STATE_FILENAME}`], cwd);
        const parsed = JSON.parse(json);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : null;
    }
    catch {
        return null;
    }
}
function writeJsonState(ref, state, cwd, opts) {
    const origin = opts?.remote ?? "origin";
    const json = JSON.stringify(state, null, 2) + "\n";
    const blobSha = (0, git_js_1.git)(["hash-object", "-w", "--stdin"], cwd, json);
    const treeInput = `100644 blob ${blobSha}\t${STATE_FILENAME}\n`;
    const treeSha = (0, git_js_1.git)(["mktree"], cwd, treeInput);
    let parentArg;
    let expectedOid = null;
    try {
        const parentSha = (0, git_js_1.git)(["rev-parse", "--verify", ref], cwd);
        parentArg = ["-p", parentSha];
        expectedOid = parentSha;
    }
    catch {
        parentArg = [];
    }
    const commitSha = (0, git_js_1.git)(["commit-tree", treeSha, ...parentArg, "-m", `scheduled-state: ${ref}`], cwd);
    (0, git_js_1.git)(["update-ref", ref, commitSha], cwd);
    const pushTarget = resolveRemoteTarget(origin, opts);
    const leaseArg = expectedOid ? `--force-with-lease=${ref}:${expectedOid}` : "--force";
    (0, git_js_1.git)(["push", leaseArg, pushTarget, `${ref}:${ref}`], cwd);
}
function resolveScheduledActivityGate(input) {
    const policy = (0, schedule_policy_js_1.parseSchedulePolicy)(input.schedulePolicy);
    const mode = (0, schedule_policy_js_1.getScheduleModeForWorkflow)(policy, input.workflow);
    const base = {
        mode,
        dependencyValue: "",
        selfValue: "",
    };
    if (input.eventName !== "schedule") {
        return { ...base, skip: false, reason: "non-scheduled run" };
    }
    if (mode === "disabled") {
        return { ...base, skip: true, reason: "schedule policy disabled workflow" };
    }
    if (mode === "always_run") {
        return { ...base, skip: false, reason: "schedule policy always_run" };
    }
    const dependencyRef = input.dependencyRef || "";
    const dependencyField = input.dependencyField || "";
    const selfRef = input.selfRef || "";
    const selfField = input.selfField || "";
    const activityCount = input.activityCount ?? "";
    if (activityCount.trim()) {
        const count = Number(activityCount);
        if (Number.isFinite(count) && count <= 0) {
            return { ...base, skip: true, reason: "activity count is zero" };
        }
        if (Number.isFinite(count) && count > 0) {
            return { ...base, skip: false, reason: "activity count is nonzero" };
        }
        return { ...base, skip: false, reason: "invalid activity count" };
    }
    if (!dependencyRef || !dependencyField || !selfRef || !selfField) {
        return { ...base, skip: false, reason: "missing activity cursor configuration" };
    }
    const cwd = input.cwd || process.cwd();
    const dependencyValue = readField(fetchJsonState(dependencyRef, cwd, input.pushOptions), dependencyField);
    const selfValue = readField(fetchJsonState(selfRef, cwd, input.pushOptions), selfField);
    return resolveCursorActivity(mode, dependencyValue, selfValue);
}
//# sourceMappingURL=scheduled-activity.js.map