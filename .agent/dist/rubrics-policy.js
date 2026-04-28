"use strict";
// Parses AGENT_RUBRICS_POLICY, the repository-level configuration for which
// routes can read / write the dedicated user rubric branch.
//
// Rubrics are intentionally separate from repository memory:
// - memory captures agent/project continuity and agent-learned context
// - rubrics capture user/team preferences that steer and evaluate agent work
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
// Default when empty or unset: every route gets "read-only". The dedicated
// rubrics update workflow opts into "enabled" with rubrics_mode_override.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUBRICS_HARD_DISABLED_ROUTES = exports.DEFAULT_RUBRICS_MODE = exports.RUBRICS_MODES = void 0;
exports.parseRubricsPolicy = parseRubricsPolicy;
exports.getRubricsModeForRoute = getRubricsModeForRoute;
exports.isRubricsHardDisabledRoute = isRubricsHardDisabledRoute;
exports.rubricsModeAllowsRead = rubricsModeAllowsRead;
exports.rubricsModeAllowsWrite = rubricsModeAllowsWrite;
exports.isRubricsMode = isRubricsMode;
exports.RUBRICS_MODES = ["enabled", "read-only", "disabled"];
exports.DEFAULT_RUBRICS_MODE = "read-only";
exports.RUBRICS_HARD_DISABLED_ROUTES = ["dispatch"];
const VALID_MODE_SET = new Set(exports.RUBRICS_MODES);
const RUBRICS_HARD_DISABLED_ROUTE_SET = new Set(exports.RUBRICS_HARD_DISABLED_ROUTES);
const VALID_ROUTE_KEY = /^[a-z0-9][a-z0-9._-]*$/;
function normalizeMode(value, label) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!VALID_MODE_SET.has(normalized)) {
        throw new Error(`${label} must be one of ${exports.RUBRICS_MODES.join(", ")} (got ${normalized || "empty"})`);
    }
    return normalized;
}
function parseRubricsPolicy(raw) {
    const text = String(raw || "").trim();
    if (!text) {
        return { defaultMode: exports.DEFAULT_RUBRICS_MODE, routeOverrides: {} };
    }
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Rubrics policy must be a JSON object");
    }
    const policy = {
        defaultMode: exports.DEFAULT_RUBRICS_MODE,
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
                throw new Error(`Invalid route override key in rubrics policy: ${normalizedRoute || "missing"}`);
            }
            policy.routeOverrides[normalizedRoute] = normalizeMode(mode, `route_overrides.${normalizedRoute}`);
        }
    }
    return policy;
}
function getRubricsModeForRoute(policy, route) {
    const normalizedRoute = String(route || "").trim().toLowerCase();
    if (isRubricsHardDisabledRoute(normalizedRoute)) {
        return "disabled";
    }
    if (normalizedRoute && normalizedRoute in policy.routeOverrides) {
        return policy.routeOverrides[normalizedRoute];
    }
    return policy.defaultMode;
}
function isRubricsHardDisabledRoute(route) {
    const normalizedRoute = String(route || "").trim().toLowerCase();
    return RUBRICS_HARD_DISABLED_ROUTE_SET.has(normalizedRoute);
}
function rubricsModeAllowsRead(mode) {
    return mode !== "disabled";
}
function rubricsModeAllowsWrite(mode) {
    return mode === "enabled";
}
function isRubricsMode(value) {
    return typeof value === "string" && VALID_MODE_SET.has(value);
}
//# sourceMappingURL=rubrics-policy.js.map