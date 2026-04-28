"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isKnownAuthorAssociation = isKnownAuthorAssociation;
exports.parseAccessPolicy = parseAccessPolicy;
exports.getAllowedAssociationsForRoute = getAllowedAssociationsForRoute;
exports.isAssociationAllowedForRoute = isAssociationAllowedForRoute;
const VALID_ASSOCIATIONS = new Set([
    "OWNER",
    "MEMBER",
    "COLLABORATOR",
    "CONTRIBUTOR",
    "FIRST_TIME_CONTRIBUTOR",
    "FIRST_TIMER",
    "MANNEQUIN",
    "NONE",
]);
const VALID_ROUTE_KEY = /^[a-z0-9][a-z0-9._-]*$/;
const DEFAULT_PRIVATE_ALLOWED_ASSOCIATIONS = [
    "OWNER",
    "MEMBER",
    "COLLABORATOR",
    "CONTRIBUTOR",
];
const DEFAULT_PUBLIC_ALLOWED_ASSOCIATIONS = [
    "OWNER",
    "MEMBER",
    "COLLABORATOR",
    "CONTRIBUTOR",
];
function normalizeAssociationList(value, label) {
    if (!Array.isArray(value)) {
        throw new Error(`${label} must be an array`);
    }
    const normalized = value.map((entry) => String(entry || "").trim().toUpperCase());
    if (normalized.length === 0) {
        throw new Error(`${label} must contain at least one author association`);
    }
    if (normalized.some((entry) => !VALID_ASSOCIATIONS.has(entry))) {
        throw new Error(`${label} contains unsupported author associations`);
    }
    return [...new Set(normalized)];
}
function isKnownAuthorAssociation(association) {
    return VALID_ASSOCIATIONS.has(String(association || "").trim().toUpperCase());
}
function parseAccessPolicy(raw) {
    const text = String(raw || "").trim();
    if (!text) {
        return { routeOverrides: {} };
    }
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Access policy must be a JSON object");
    }
    const policy = { routeOverrides: {} };
    if ("allowed_associations" in payload) {
        policy.defaultAllowedAssociations = normalizeAssociationList(payload.allowed_associations, "allowed_associations");
    }
    if ("route_overrides" in payload) {
        const routePolicy = payload.route_overrides;
        if (!routePolicy || typeof routePolicy !== "object" || Array.isArray(routePolicy)) {
            throw new Error("route_overrides must be an object");
        }
        for (const [route, associations] of Object.entries(routePolicy)) {
            const normalizedRoute = String(route || "").trim().toLowerCase();
            if (!VALID_ROUTE_KEY.test(normalizedRoute)) {
                throw new Error(`Invalid route override key in access policy: ${normalizedRoute || "missing"}`);
            }
            policy.routeOverrides[normalizedRoute] = normalizeAssociationList(associations, `route_overrides.${normalizedRoute}`);
        }
    }
    return policy;
}
function getAllowedAssociationsForRoute(policy, route, isPublicRepo) {
    const normalizedRoute = String(route || "").trim().toLowerCase();
    const configuredRoute = normalizedRoute
        ? policy.routeOverrides[normalizedRoute]
        : undefined;
    if (configuredRoute) {
        return [...configuredRoute];
    }
    if (policy.defaultAllowedAssociations) {
        return [...policy.defaultAllowedAssociations];
    }
    return isPublicRepo
        ? [...DEFAULT_PUBLIC_ALLOWED_ASSOCIATIONS]
        : [...DEFAULT_PRIVATE_ALLOWED_ASSOCIATIONS];
}
function isAssociationAllowedForRoute(policy, route, association, isPublicRepo) {
    const normalizedAssociation = String(association || "").trim().toUpperCase();
    return getAllowedAssociationsForRoute(policy, route, isPublicRepo).includes(normalizedAssociation);
}
//# sourceMappingURL=access-policy.js.map