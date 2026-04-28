"use strict";
// Parses AGENT_MEMORY_POLICY, the repository-level configuration for which
// routes can read / write agent memory.
//
// Shape (both sections optional):
//   {
//     "default_mode": "enabled" | "read-only" | "disabled",
//     "route_overrides": {
//       "<route>": "enabled" | "read-only" | "disabled",
//       ...
//     }
//   }
//
// Default when the variable is empty or unset: every route gets "enabled".
// Modes:
//   - enabled    — download memory before the run; commit+push edits after
//   - read-only  — download memory before the run; skip the commit step
//   - disabled   — skip memory entirely
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MEMORY_MODE = exports.MEMORY_MODES = void 0;
exports.parseMemoryPolicy = parseMemoryPolicy;
exports.getMemoryModeForRoute = getMemoryModeForRoute;
exports.memoryModeAllowsRead = memoryModeAllowsRead;
exports.memoryModeAllowsWrite = memoryModeAllowsWrite;
exports.isMemoryMode = isMemoryMode;
exports.MEMORY_MODES = ["enabled", "read-only", "disabled"];
exports.DEFAULT_MEMORY_MODE = "enabled";
const VALID_MODE_SET = new Set(exports.MEMORY_MODES);
const VALID_ROUTE_KEY = /^[a-z0-9][a-z0-9._-]*$/;
function normalizeMode(value, label) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!VALID_MODE_SET.has(normalized)) {
        throw new Error(`${label} must be one of ${exports.MEMORY_MODES.join(", ")} (got ${normalized || "empty"})`);
    }
    return normalized;
}
function parseMemoryPolicy(raw) {
    const text = String(raw || "").trim();
    if (!text) {
        return { defaultMode: exports.DEFAULT_MEMORY_MODE, routeOverrides: {} };
    }
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Memory policy must be a JSON object");
    }
    const policy = {
        defaultMode: exports.DEFAULT_MEMORY_MODE,
        routeOverrides: {},
    };
    if ("default_mode" in payload) {
        policy.defaultMode = normalizeMode(payload.default_mode, "default_mode");
    }
    if ("route_overrides" in payload) {
        const overrides = payload.route_overrides;
        if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
            throw new Error("route_overrides must be an object");
        }
        for (const [route, mode] of Object.entries(overrides)) {
            const normalizedRoute = String(route || "").trim().toLowerCase();
            if (!VALID_ROUTE_KEY.test(normalizedRoute)) {
                throw new Error(`Invalid route override key in memory policy: ${normalizedRoute || "missing"}`);
            }
            policy.routeOverrides[normalizedRoute] = normalizeMode(mode, `route_overrides.${normalizedRoute}`);
        }
    }
    return policy;
}
function getMemoryModeForRoute(policy, route) {
    const normalizedRoute = String(route || "").trim().toLowerCase();
    if (normalizedRoute && normalizedRoute in policy.routeOverrides) {
        return policy.routeOverrides[normalizedRoute];
    }
    return policy.defaultMode;
}
function memoryModeAllowsRead(mode) {
    return mode !== "disabled";
}
function memoryModeAllowsWrite(mode) {
    return mode === "enabled";
}
function isMemoryMode(value) {
    return typeof value === "string" && VALID_MODE_SET.has(value);
}
//# sourceMappingURL=memory-policy.js.map