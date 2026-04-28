"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const repoRoot = (0, node_path_1.resolve)(__dirname, "../../..");
const scriptPath = (0, node_path_1.join)(repoRoot, ".github/actions/check-agent-action-expiration/check-expiration.sh");
function runExpirationCheck(expiresAt) {
    const dir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "agent-action-expiration-"));
    const outputPath = (0, node_path_1.join)(dir, "github-output.txt");
    const result = (0, node_child_process_1.spawnSync)("bash", [scriptPath], {
        env: {
            ...process.env,
            GITHUB_OUTPUT: outputPath,
            INPUT_EXPIRES_AT: expiresAt,
        },
        encoding: "utf8",
    });
    let outputs = {};
    try {
        outputs = Object.fromEntries((0, node_fs_1.readFileSync)(outputPath, "utf8")
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => {
            const index = line.indexOf("=");
            return [line.slice(0, index), line.slice(index + 1)];
        }));
    }
    catch {
        outputs = {};
    }
    return {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        outputs,
    };
}
(0, node_test_1.default)("check-agent-action-expiration marks future and past dates", () => {
    const future = runExpirationCheck("2099-01-01");
    strict_1.default.equal(future.status, 0);
    strict_1.default.equal(future.outputs.expired, "false");
    strict_1.default.equal(future.outputs.expires_at, "2099-01-01");
    strict_1.default.match(future.outputs.today, /^\d{4}-\d{2}-\d{2}$/);
    const past = runExpirationCheck("2000-01-01");
    strict_1.default.equal(past.status, 0);
    strict_1.default.equal(past.outputs.expired, "true");
    strict_1.default.equal(past.outputs.expires_at, "2000-01-01");
});
(0, node_test_1.default)("check-agent-action-expiration rejects invalid dates", () => {
    const invalidFormat = runExpirationCheck("01-01-2099");
    strict_1.default.equal(invalidFormat.status, 2);
    strict_1.default.match(invalidFormat.stderr, /YYYY-MM-DD/);
    const impossibleDate = runExpirationCheck("2026-02-30");
    strict_1.default.equal(impossibleDate.status, 2);
    strict_1.default.match(impossibleDate.stderr, /day is invalid/);
});
//# sourceMappingURL=agent-action-expiration.test.js.map