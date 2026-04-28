"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const repoRoot = node_path_1.default.resolve(__dirname, "../../..");
const resolverScript = node_path_1.default.join(repoRoot, ".github/actions/resolve-agent-provider/resolve-provider.sh");
function parseOutputs(outputFile) {
    if (!(0, node_fs_1.existsSync)(outputFile)) {
        return {};
    }
    return Object.fromEntries((0, node_fs_1.readFileSync)(outputFile, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
        const separator = line.indexOf("=");
        node_assert_1.strict.notEqual(separator, -1, `Expected GitHub output line with '=': ${line}`);
        return [line.slice(0, separator), line.slice(separator + 1)];
    }));
}
function runResolver(env = {}) {
    const tempDir = (0, node_fs_1.mkdtempSync)(node_path_1.default.join((0, node_os_1.tmpdir)(), "agent-provider-"));
    const outputFile = node_path_1.default.join(tempDir, "github-output");
    try {
        const result = (0, node_child_process_1.spawnSync)("bash", [resolverScript], {
            encoding: "utf8",
            env: {
                ...process.env,
                GITHUB_OUTPUT: outputFile,
                ROUTE: "test-route",
                ROUTE_PROVIDER: "",
                DEFAULT_PROVIDER: "auto",
                OPENAI_API_KEY: "",
                CLAUDE_CODE_OAUTH_TOKEN: "",
                REQUIRED: "true",
                ...env,
            },
        });
        return {
            ...result,
            outputs: parseOutputs(outputFile),
        };
    }
    finally {
        (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
    }
}
(0, node_test_1.test)("provider resolver auto-detects configured providers deterministically", () => {
    const both = runResolver({
        OPENAI_API_KEY: "openai-token",
        CLAUDE_CODE_OAUTH_TOKEN: "claude-token",
    });
    node_assert_1.strict.equal(both.status, 0, both.stderr);
    node_assert_1.strict.equal(both.outputs.provider, "codex");
    node_assert_1.strict.equal(both.outputs.reason, "OPENAI_API_KEY is configured");
    node_assert_1.strict.equal(both.outputs.install_codex, "true");
    node_assert_1.strict.equal(both.outputs.install_claude, "false");
    const claudeOnly = runResolver({ CLAUDE_CODE_OAUTH_TOKEN: "claude-token" });
    node_assert_1.strict.equal(claudeOnly.status, 0, claudeOnly.stderr);
    node_assert_1.strict.equal(claudeOnly.outputs.provider, "claude");
    node_assert_1.strict.equal(claudeOnly.outputs.reason, "CLAUDE_CODE_OAUTH_TOKEN is configured");
    node_assert_1.strict.equal(claudeOnly.outputs.install_codex, "false");
    node_assert_1.strict.equal(claudeOnly.outputs.install_claude, "true");
});
(0, node_test_1.test)("provider resolver honors default and inline route overrides", () => {
    const defaultOverride = runResolver({
        DEFAULT_PROVIDER: " Claude ",
        OPENAI_API_KEY: "openai-token",
        CLAUDE_CODE_OAUTH_TOKEN: "claude-token",
    });
    node_assert_1.strict.equal(defaultOverride.status, 0, defaultOverride.stderr);
    node_assert_1.strict.equal(defaultOverride.outputs.provider, "claude");
    node_assert_1.strict.equal(defaultOverride.outputs.reason, "AGENT_DEFAULT_PROVIDER");
    const routeOverride = runResolver({
        ROUTE_PROVIDER: "codex",
        DEFAULT_PROVIDER: "claude",
        OPENAI_API_KEY: "openai-token",
        CLAUDE_CODE_OAUTH_TOKEN: "claude-token",
    });
    node_assert_1.strict.equal(routeOverride.status, 0, routeOverride.stderr);
    node_assert_1.strict.equal(routeOverride.outputs.provider, "codex");
    node_assert_1.strict.equal(routeOverride.outputs.reason, "route override for test-route");
});
(0, node_test_1.test)("provider resolver supports explicit providers without repository secrets", () => {
    const codex = runResolver({ DEFAULT_PROVIDER: "codex" });
    node_assert_1.strict.equal(codex.status, 0, codex.stderr);
    node_assert_1.strict.equal(codex.outputs.provider, "codex");
    node_assert_1.strict.equal(codex.outputs.reason, "AGENT_DEFAULT_PROVIDER");
    node_assert_1.strict.equal(codex.outputs.install_codex, "true");
    node_assert_1.strict.equal(codex.outputs.install_claude, "false");
    node_assert_1.strict.match(codex.stderr, /relying on local Codex authentication/);
    const claude = runResolver({ ROUTE_PROVIDER: "claude", DEFAULT_PROVIDER: "codex" });
    node_assert_1.strict.equal(claude.status, 0, claude.stderr);
    node_assert_1.strict.equal(claude.outputs.provider, "claude");
    node_assert_1.strict.equal(claude.outputs.reason, "route override for test-route");
    node_assert_1.strict.equal(claude.outputs.install_codex, "false");
    node_assert_1.strict.equal(claude.outputs.install_claude, "true");
    node_assert_1.strict.match(claude.stderr, /relying on local Claude authentication/);
});
(0, node_test_1.test)("provider resolver supports nonfatal unresolved setup passes", () => {
    const soft = runResolver({ REQUIRED: "false" });
    node_assert_1.strict.equal(soft.status, 0, soft.stderr);
    node_assert_1.strict.equal(soft.outputs.provider, "");
    node_assert_1.strict.equal(soft.outputs.reason, "no configured provider");
    node_assert_1.strict.equal(soft.outputs.install_codex, "false");
    node_assert_1.strict.equal(soft.outputs.install_claude, "false");
    node_assert_1.strict.match(soft.stderr, /No configured agent provider/);
    node_assert_1.strict.match(soft.stdout, /unresolved/);
});
(0, node_test_1.test)("provider resolver rejects invalid providers and required auto without readiness", () => {
    const invalid = runResolver({ DEFAULT_PROVIDER: "co dex", OPENAI_API_KEY: "openai-token" });
    node_assert_1.strict.notEqual(invalid.status, 0);
    node_assert_1.strict.match(invalid.stderr, /Invalid agent provider 'co dex'/);
    const missingAuto = runResolver();
    node_assert_1.strict.notEqual(missingAuto.status, 0);
    node_assert_1.strict.match(missingAuto.stderr, /No configured agent provider/);
});
//# sourceMappingURL=resolve-agent-provider.test.js.map