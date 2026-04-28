import { type AccessPolicy } from "./access-policy.js";
export declare const ROUTES: Set<string>;
export interface DispatchDecision {
    route: string;
    needsApproval: boolean;
    confidence: string;
    summary: string;
    issueTitle: string;
    issueBody: string;
}
export interface RequestedLabelDecision {
    route: string;
    skill: string;
}
export interface RequestedRouteDecision {
    route: string;
    skill: string;
}
/**
 * Extracts an explicit mention slash command such as
 * `@sepo-agent /review` from the request body.
 */
export declare function extractRequestedRoute(body: string, mention: string): string;
/**
 * Extracts an explicit mention slash command decision such as
 * `@sepo-agent /review` or `@sepo-agent /skill release-notes`.
 */
export declare function extractRequestedRouteDecision(body: string, mention: string): RequestedRouteDecision;
/**
 * Builds a deterministic routing decision for explicit slash commands so the
 * portal can skip the dispatch agent when the user already picked the route.
 */
export declare function buildRequestedRouteDecision(route: string, requestText: string): DispatchDecision;
/**
 * Resolves deterministic label-based routes. Unknown `agent/*` labels return null.
 */
export declare function resolveRequestedLabel(labelName: string): RequestedLabelDecision | null;
/**
 * Validates and normalizes the portal dispatch decision emitted by the model.
 */
export declare function normalizeDispatch(raw: string): DispatchDecision;
/**
 * Applies repository policy to the model-emitted dispatch decision so approval
 * requirements do not depend on the model getting control flags exactly right.
 */
export declare function applyDispatchPolicy(decision: DispatchDecision, targetKind: string, authorAssociation?: string, accessPolicy?: AccessPolicy, isPublicRepo?: boolean, isExplicit?: boolean): DispatchDecision;
//# sourceMappingURL=triage.d.ts.map