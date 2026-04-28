"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_BUNDLE_SCHEMA_VERSION = void 0;
exports.parseSessionBundleMode = parseSessionBundleMode;
exports.shouldUseSessionBundles = shouldUseSessionBundles;
exports.hasValidThreadTargetNumber = hasValidThreadTargetNumber;
exports.buildSessionBundleArtifactName = buildSessionBundleArtifactName;
exports.formatSessionRestoreNotice = formatSessionRestoreNotice;
exports.discoverSessionBundleFiles = discoverSessionBundleFiles;
exports.createSessionBundle = createSessionBundle;
exports.restoreSessionBundle = restoreSessionBundle;
exports.findSessionBundleArchive = findSessionBundleArchive;
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const session_policy_js_1 = require("./session-policy.js");
exports.SESSION_BUNDLE_SCHEMA_VERSION = 1;
function sha256File(path) {
    const hash = (0, node_crypto_1.createHash)("sha256");
    hash.update((0, node_fs_1.readFileSync)(path));
    return hash.digest("hex");
}
function shortHash(value) {
    return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex").slice(0, 12);
}
function sanitizeArtifactComponent(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "default";
}
function escapeFindNamePattern(value) {
    return value.replace(/([*?\[\]\\])/g, "\\$1");
}
function findFilesByName(root, pattern) {
    if (!root || !(0, node_fs_1.existsSync)(root)) {
        return [];
    }
    try {
        const output = (0, node_child_process_1.execFileSync)("find", [root, "-type", "f", "-name", pattern], {
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 10 * 1024 * 1024,
        }).toString("utf8");
        return output
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .sort();
    }
    catch {
        return [];
    }
}
function toHomeRelativePath(absolutePath, homeDir) {
    const resolvedHome = (0, node_path_1.resolve)(homeDir);
    const resolvedPath = (0, node_path_1.resolve)(absolutePath);
    const rel = (0, node_path_1.relative)(resolvedHome, resolvedPath);
    if (!rel || rel.startsWith("..") || (0, node_path_1.isAbsolute)(rel)) {
        return null;
    }
    return rel.replace(/\\/g, "/");
}
function addBundleFile(files, absolutePath, homeDir) {
    if (!(0, node_fs_1.existsSync)(absolutePath)) {
        return;
    }
    const relativePath = toHomeRelativePath(absolutePath, homeDir);
    if (!relativePath || files.has(relativePath)) {
        return;
    }
    const stats = (0, node_fs_1.statSync)(absolutePath);
    if (!stats.isFile()) {
        return;
    }
    files.set(relativePath, {
        absolute_path: absolutePath,
        relative_path: relativePath,
        size_bytes: stats.size,
        sha256: sha256File(absolutePath),
    });
}
function parseSessionBundleMode(value) {
    const normalized = value?.trim().toLowerCase();
    if (normalized === "always" || normalized === "never") {
        return normalized;
    }
    return "auto";
}
function shouldUseSessionBundles(mode, policy) {
    if (policy === "none" || mode === "never") {
        return false;
    }
    if (mode === "always") {
        return true;
    }
    return (0, session_policy_js_1.attemptsResume)(policy);
}
function hasValidThreadTargetNumber(targetKind, targetNumber) {
    if (!Number.isFinite(targetNumber)) {
        return false;
    }
    if (targetKind === "repository") {
        return targetNumber >= 0;
    }
    return targetNumber > 0;
}
function buildSessionBundleArtifactName(threadKey, runId) {
    const [, targetKind = "target", targetNumber = "0", route = "route", lane = "default"] = String(threadKey || "").split(":");
    const suffix = shortHash(threadKey);
    const parts = [
        "session-bundle",
        sanitizeArtifactComponent(targetKind),
        sanitizeArtifactComponent(targetNumber),
        sanitizeArtifactComponent(route),
        sanitizeArtifactComponent(lane),
        suffix,
        sanitizeArtifactComponent(runId || "run"),
    ];
    return parts.join("-");
}
function formatSessionRestoreNotice(args) {
    const resumeStatus = String(args.resumeStatus || "").trim().toLowerCase();
    const runStatus = String(args.runStatus || "").trim().toLowerCase();
    if (resumeStatus === "fallback_fresh") {
        if (runStatus === "success" || runStatus === "no_changes" || runStatus === "verify_failed") {
            return "Session continuity could not be restored, so this run continued with a fresh session.";
        }
        return "Session continuity could not be restored for this run.";
    }
    if (resumeStatus === "failed") {
        return "Session continuity could not be restored for this run.";
    }
    return "";
}
function discoverSessionBundleFiles(args) {
    const files = new Map();
    const normalizedAgent = String(args.agent || "").trim().toLowerCase();
    const homeDir = (0, node_path_1.resolve)(args.homeDir);
    if (args.acpxRecordId) {
        addBundleFile(files, (0, node_path_1.join)(homeDir, ".acpx", "sessions", `${args.acpxRecordId}.json`), homeDir);
        addBundleFile(files, (0, node_path_1.join)(homeDir, ".acpx", "sessions", `${args.acpxRecordId}.stream.ndjson`), homeDir);
    }
    if (args.acpxSessionId) {
        if (normalizedAgent === "codex") {
            for (const match of findFilesByName((0, node_path_1.join)(homeDir, ".codex", "sessions"), `*${escapeFindNamePattern(args.acpxSessionId)}*.jsonl`)) {
                addBundleFile(files, match, homeDir);
            }
        }
        if (normalizedAgent === "claude") {
            for (const match of findFilesByName((0, node_path_1.join)(homeDir, ".claude", "projects"), `*${escapeFindNamePattern(args.acpxSessionId)}*.jsonl`)) {
                addBundleFile(files, match, homeDir);
            }
        }
    }
    return Array.from(files.values()).sort((a, b) => a.relative_path.localeCompare(b.relative_path));
}
function createSessionBundle(args) {
    const files = discoverSessionBundleFiles({
        agent: args.agent,
        acpxRecordId: args.acpxRecordId,
        acpxSessionId: args.acpxSessionId,
        homeDir: args.homeDir,
    });
    if (files.length === 0) {
        return null;
    }
    const stageDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)(args.runnerTemp || (0, node_os_1.tmpdir)(), "session-bundle-stage-"));
    const payloadDir = (0, node_path_1.join)(stageDir, "files");
    (0, node_fs_1.mkdirSync)(payloadDir, { recursive: true });
    const manifest = {
        schema_version: exports.SESSION_BUNDLE_SCHEMA_VERSION,
        agent: args.agent,
        thread_key: args.threadKey,
        repo_slug: args.repoSlug,
        cwd: args.cwd,
        acpx_record_id: args.acpxRecordId,
        acpx_session_id: args.acpxSessionId,
        created_at: new Date().toISOString(),
        files: files.map((file) => ({
            relative_path: file.relative_path,
            size_bytes: file.size_bytes,
            sha256: file.sha256,
        })),
    };
    for (const file of files) {
        const target = (0, node_path_1.join)(payloadDir, file.relative_path);
        (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(target), { recursive: true });
        (0, node_fs_1.cpSync)(file.absolute_path, target);
    }
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(stageDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
    const bundlePath = (0, node_path_1.join)(args.runnerTemp || (0, node_os_1.tmpdir)(), `session-bundle-${shortHash(args.threadKey + args.acpxSessionId)}.tgz`);
    (0, node_child_process_1.execFileSync)("tar", ["-czf", bundlePath, "-C", stageDir, "manifest.json", "files"], {
        stdio: ["pipe", "pipe", "pipe"],
    });
    (0, node_fs_1.rmSync)(stageDir, { recursive: true, force: true });
    return {
        bundlePath,
        manifest,
        totalSizeBytes: files.reduce((sum, file) => sum + file.size_bytes, 0),
        fileCount: files.length,
    };
}
function validateManifest(value) {
    if (!value || typeof value !== "object") {
        throw new Error("Session bundle manifest must be an object");
    }
    const manifest = value;
    if (manifest.schema_version !== exports.SESSION_BUNDLE_SCHEMA_VERSION) {
        throw new Error(`Unsupported session bundle schema: ${String(manifest.schema_version ?? "missing")}`);
    }
    if (!Array.isArray(manifest.files)) {
        throw new Error("Session bundle manifest is missing files");
    }
    return manifest;
}
function restoreSessionBundle(bundlePath, homeDir) {
    const extractDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "session-bundle-restore-"));
    const resolvedHome = (0, node_path_1.resolve)(homeDir);
    const homePrefix = resolvedHome.endsWith(node_path_1.sep) ? resolvedHome : resolvedHome + node_path_1.sep;
    try {
        (0, node_child_process_1.execFileSync)("tar", ["-xzf", bundlePath, "-C", extractDir], {
            stdio: ["pipe", "pipe", "pipe"],
        });
        const manifest = validateManifest(JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(extractDir, "manifest.json"), "utf8")));
        for (const file of manifest.files) {
            const rel = String(file.relative_path || "").replace(/\\/g, "/");
            if (!rel || (0, node_path_1.isAbsolute)(rel) || rel.startsWith("../") || rel.includes("/../")) {
                throw new Error(`Invalid bundle path: ${rel || "missing"}`);
            }
            const source = (0, node_path_1.join)(extractDir, "files", rel);
            if (!(0, node_fs_1.existsSync)(source)) {
                throw new Error(`Bundle file missing: ${rel}`);
            }
            const actualSha = sha256File(source);
            if (actualSha !== file.sha256) {
                throw new Error(`Bundle file checksum mismatch: ${rel}`);
            }
            const dest = (0, node_path_1.resolve)(resolvedHome, rel);
            if (!(dest === resolvedHome || dest.startsWith(homePrefix))) {
                throw new Error(`Bundle path escapes HOME: ${rel}`);
            }
            (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(dest), { recursive: true });
            (0, node_fs_1.cpSync)(source, dest);
        }
        return manifest;
    }
    finally {
        (0, node_fs_1.rmSync)(extractDir, { recursive: true, force: true });
    }
}
function findSessionBundleArchive(dir) {
    const matches = findFilesByName(dir, "*.tgz");
    return matches[0] || null;
}
//# sourceMappingURL=session-bundle.js.map