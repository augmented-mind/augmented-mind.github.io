"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const session_bundle_js_1 = require("../session-bundle.js");
function makeTempDir(prefix) {
    return (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), prefix));
}
(0, node_test_1.test)("parseSessionBundleMode defaults to auto", () => {
    node_assert_1.strict.equal((0, session_bundle_js_1.parseSessionBundleMode)(undefined), "auto");
    node_assert_1.strict.equal((0, session_bundle_js_1.parseSessionBundleMode)(""), "auto");
    node_assert_1.strict.equal((0, session_bundle_js_1.parseSessionBundleMode)("ALWAYS"), "always");
    node_assert_1.strict.equal((0, session_bundle_js_1.parseSessionBundleMode)("never"), "never");
});
(0, node_test_1.test)("shouldUseSessionBundles follows auto and explicit mode semantics", () => {
    node_assert_1.strict.equal((0, session_bundle_js_1.shouldUseSessionBundles)("auto", "none"), false);
    node_assert_1.strict.equal((0, session_bundle_js_1.shouldUseSessionBundles)("auto", "track-only"), false);
    node_assert_1.strict.equal((0, session_bundle_js_1.shouldUseSessionBundles)("auto", "resume-best-effort"), true);
    node_assert_1.strict.equal((0, session_bundle_js_1.shouldUseSessionBundles)("auto", "resume-required"), true);
    node_assert_1.strict.equal((0, session_bundle_js_1.shouldUseSessionBundles)("always", "track-only"), true);
    node_assert_1.strict.equal((0, session_bundle_js_1.shouldUseSessionBundles)("never", "resume-required"), false);
});
(0, node_test_1.test)("hasValidThreadTargetNumber permits repository target_number=0", () => {
    node_assert_1.strict.equal((0, session_bundle_js_1.hasValidThreadTargetNumber)("repository", 0), true);
    node_assert_1.strict.equal((0, session_bundle_js_1.hasValidThreadTargetNumber)("repository", 1), true);
    node_assert_1.strict.equal((0, session_bundle_js_1.hasValidThreadTargetNumber)("issue", 0), false);
    node_assert_1.strict.equal((0, session_bundle_js_1.hasValidThreadTargetNumber)("pull_request", 42), true);
    node_assert_1.strict.equal((0, session_bundle_js_1.hasValidThreadTargetNumber)("discussion", Number.NaN), false);
});
(0, node_test_1.test)("session bundle CLIs tolerate repository target_number=0", () => {
    const cases = [
        {
            script: "session-restore.js",
            env: { SESSION_POLICY: "none", SESSION_BUNDLE_MODE: "auto" },
        },
        {
            script: "session-backup.js",
            env: {
                ACPX_AGENT: "codex",
                SESSION_POLICY: "resume-best-effort",
                SESSION_BUNDLE_MODE: "always",
            },
        },
        // Register skips without artifact metadata; the helper unit test covers validation.
        {
            script: "session-register.js",
            env: {
                SESSION_POLICY: "resume-best-effort",
                SESSION_BUNDLE_MODE: "always",
            },
        },
    ];
    for (const entry of cases) {
        const tempDir = makeTempDir("session-bundle-cli-");
        try {
            const result = (0, node_child_process_1.spawnSync)(process.execPath, [(0, node_path_1.join)(process.cwd(), "dist", "cli", entry.script)], {
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    ...entry.env,
                    GITHUB_OUTPUT: (0, node_path_1.join)(tempDir, "github-output"),
                    GITHUB_REPOSITORY: "self-evolving/repo",
                    ROUTE: "answer",
                    TARGET_KIND: "repository",
                    TARGET_NUMBER: "0",
                },
                encoding: "utf8",
            });
            node_assert_1.strict.equal(result.status, 0, `${entry.script} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        }
        finally {
            (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
        }
    }
});
(0, node_test_1.test)("buildSessionBundleArtifactName is deterministic and includes route identity", () => {
    const name = (0, session_bundle_js_1.buildSessionBundleArtifactName)("self-evolving/repo:pull_request:99:fix-pr:default", "12345");
    node_assert_1.strict.match(name, /^session-bundle-pull_request-99-fix-pr-default-/);
    node_assert_1.strict.match(name, /-12345$/);
    node_assert_1.strict.equal(name, (0, session_bundle_js_1.buildSessionBundleArtifactName)("self-evolving/repo:pull_request:99:fix-pr:default", "12345"));
});
(0, node_test_1.test)("formatSessionRestoreNotice reports fallback and failure outcomes", () => {
    node_assert_1.strict.match((0, session_bundle_js_1.formatSessionRestoreNotice)({ resumeStatus: "fallback_fresh", runStatus: "success" }), /continued with a fresh session/);
    node_assert_1.strict.match((0, session_bundle_js_1.formatSessionRestoreNotice)({ resumeStatus: "failed", runStatus: "failed" }), /could not be restored/);
    node_assert_1.strict.equal((0, session_bundle_js_1.formatSessionRestoreNotice)({ resumeStatus: "resumed", runStatus: "success" }), "");
});
(0, node_test_1.test)("discoverSessionBundleFiles finds acpx and codex provider files under HOME", () => {
    const home = makeTempDir("session-bundle-home-");
    try {
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(home, ".acpx", "sessions"), { recursive: true });
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(home, ".codex", "sessions", "2026", "04", "08"), { recursive: true });
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(home, ".acpx", "sessions", "rec-1.json"), "{}\n");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(home, ".acpx", "sessions", "rec-1.stream.ndjson"), "{}\n");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(home, ".codex", "sessions", "2026", "04", "08", "rollout-ses-1.jsonl"), "hello\n");
        const files = (0, session_bundle_js_1.discoverSessionBundleFiles)({
            agent: "codex",
            acpxRecordId: "rec-1",
            acpxSessionId: "ses-1",
            homeDir: home,
        });
        node_assert_1.strict.deepEqual(files.map((file) => file.relative_path), [
            ".acpx/sessions/rec-1.json",
            ".acpx/sessions/rec-1.stream.ndjson",
            ".codex/sessions/2026/04/08/rollout-ses-1.jsonl",
        ]);
    }
    finally {
        (0, node_fs_1.rmSync)(home, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("discoverSessionBundleFiles treats session ids as literal text inside find globs", () => {
    const home = makeTempDir("session-bundle-home-literal-");
    try {
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(home, ".claude", "projects", "repo"), { recursive: true });
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(home, ".claude", "projects", "repo", "abc[1].jsonl"), "literal\n");
        const files = (0, session_bundle_js_1.discoverSessionBundleFiles)({
            agent: "claude",
            acpxRecordId: "",
            acpxSessionId: "abc[1]",
            homeDir: home,
        });
        node_assert_1.strict.deepEqual(files.map((file) => file.relative_path), [".claude/projects/repo/abc[1].jsonl"]);
    }
    finally {
        (0, node_fs_1.rmSync)(home, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("createSessionBundle and restoreSessionBundle round-trip files", () => {
    const sourceHome = makeTempDir("session-bundle-source-");
    const restoreHome = makeTempDir("session-bundle-restore-");
    const runnerTemp = makeTempDir("session-bundle-temp-");
    try {
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(sourceHome, ".acpx", "sessions"), { recursive: true });
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(sourceHome, ".codex", "sessions", "2026", "04", "08"), { recursive: true });
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(sourceHome, ".acpx", "sessions", "rec-2.json"), '{"ok":true}\n');
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(sourceHome, ".acpx", "sessions", "rec-2.stream.ndjson"), "stream\n");
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(sourceHome, ".codex", "sessions", "2026", "04", "08", "rollout-ses-2.jsonl"), "provider\n");
        const bundle = (0, session_bundle_js_1.createSessionBundle)({
            agent: "codex",
            threadKey: "self-evolving/repo:pull_request:99:fix-pr:default",
            repoSlug: "self-evolving/repo",
            cwd: "/repo",
            acpxRecordId: "rec-2",
            acpxSessionId: "ses-2",
            homeDir: sourceHome,
            runnerTemp,
        });
        node_assert_1.strict.ok(bundle);
        node_assert_1.strict.equal(bundle?.fileCount, 3);
        node_assert_1.strict.ok((0, session_bundle_js_1.findSessionBundleArchive)(runnerTemp));
        const manifest = (0, session_bundle_js_1.restoreSessionBundle)(bundle.bundlePath, restoreHome);
        node_assert_1.strict.equal(manifest.acpx_record_id, "rec-2");
        node_assert_1.strict.equal(manifest.acpx_session_id, "ses-2");
        node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(restoreHome, ".acpx", "sessions", "rec-2.json"), "utf8"), '{"ok":true}\n');
        node_assert_1.strict.equal((0, node_fs_1.readFileSync)((0, node_path_1.join)(restoreHome, ".codex", "sessions", "2026", "04", "08", "rollout-ses-2.jsonl"), "utf8"), "provider\n");
    }
    finally {
        (0, node_fs_1.rmSync)(sourceHome, { recursive: true, force: true });
        (0, node_fs_1.rmSync)(restoreHome, { recursive: true, force: true });
        (0, node_fs_1.rmSync)(runnerTemp, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("restoreSessionBundle rejects checksum mismatches", () => {
    const sourceHome = makeTempDir("session-bundle-source-bad-hash-");
    const restoreHome = makeTempDir("session-bundle-restore-bad-hash-");
    const runnerTemp = makeTempDir("session-bundle-temp-bad-hash-");
    const extracted = makeTempDir("session-bundle-edit-bad-hash-");
    try {
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(sourceHome, ".acpx", "sessions"), { recursive: true });
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(sourceHome, ".acpx", "sessions", "rec-3.json"), '{"ok":true}\n');
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(sourceHome, ".acpx", "sessions", "rec-3.stream.ndjson"), "stream\n");
        const bundle = (0, session_bundle_js_1.createSessionBundle)({
            agent: "codex",
            threadKey: "self-evolving/repo:pull_request:100:fix-pr:default",
            repoSlug: "self-evolving/repo",
            cwd: "/repo",
            acpxRecordId: "rec-3",
            acpxSessionId: "ses-3",
            homeDir: sourceHome,
            runnerTemp,
        });
        node_assert_1.strict.ok(bundle);
        const tamperedTgz = (0, node_path_1.join)(runnerTemp, "tampered.tgz");
        (0, node_child_process_1.execFileSync)("tar", ["-xzf", bundle.bundlePath, "-C", extracted]);
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(extracted, "files", ".acpx", "sessions", "rec-3.json"), '{"ok":false}\n');
        (0, node_child_process_1.execFileSync)("tar", ["-czf", tamperedTgz, "-C", extracted, "manifest.json", "files"]);
        node_assert_1.strict.throws(() => (0, session_bundle_js_1.restoreSessionBundle)(tamperedTgz, restoreHome), /checksum mismatch/);
    }
    finally {
        (0, node_fs_1.rmSync)(sourceHome, { recursive: true, force: true });
        (0, node_fs_1.rmSync)(restoreHome, { recursive: true, force: true });
        (0, node_fs_1.rmSync)(runnerTemp, { recursive: true, force: true });
        (0, node_fs_1.rmSync)(extracted, { recursive: true, force: true });
    }
});
(0, node_test_1.test)("restoreSessionBundle rejects paths that escape HOME", () => {
    const sourceHome = makeTempDir("session-bundle-source-escape-");
    const restoreHome = makeTempDir("session-bundle-restore-escape-");
    const runnerTemp = makeTempDir("session-bundle-temp-escape-");
    const extracted = makeTempDir("session-bundle-edit-escape-");
    try {
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(sourceHome, ".acpx", "sessions"), { recursive: true });
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(sourceHome, ".acpx", "sessions", "rec-4.json"), '{"ok":true}\n');
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(sourceHome, ".acpx", "sessions", "rec-4.stream.ndjson"), "stream\n");
        const bundle = (0, session_bundle_js_1.createSessionBundle)({
            agent: "codex",
            threadKey: "self-evolving/repo:pull_request:101:fix-pr:default",
            repoSlug: "self-evolving/repo",
            cwd: "/repo",
            acpxRecordId: "rec-4",
            acpxSessionId: "ses-4",
            homeDir: sourceHome,
            runnerTemp,
        });
        node_assert_1.strict.ok(bundle);
        (0, node_child_process_1.execFileSync)("tar", ["-xzf", bundle.bundlePath, "-C", extracted]);
        const manifestPath = (0, node_path_1.join)(extracted, "manifest.json");
        const manifest = JSON.parse((0, node_fs_1.readFileSync)(manifestPath, "utf8"));
        manifest.files[0].relative_path = "../../escape.txt";
        (0, node_fs_1.writeFileSync)(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
        const tamperedTgz = (0, node_path_1.join)(runnerTemp, "tampered-escape.tgz");
        (0, node_child_process_1.execFileSync)("tar", ["-czf", tamperedTgz, "-C", extracted, "manifest.json", "files"]);
        node_assert_1.strict.throws(() => (0, session_bundle_js_1.restoreSessionBundle)(tamperedTgz, restoreHome), /Invalid bundle path|escapes HOME/);
    }
    finally {
        (0, node_fs_1.rmSync)(sourceHome, { recursive: true, force: true });
        (0, node_fs_1.rmSync)(restoreHome, { recursive: true, force: true });
        (0, node_fs_1.rmSync)(runnerTemp, { recursive: true, force: true });
        (0, node_fs_1.rmSync)(extracted, { recursive: true, force: true });
    }
});
//# sourceMappingURL=session-bundle.test.js.map