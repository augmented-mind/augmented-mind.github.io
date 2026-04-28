export interface AccessPolicy {
    defaultAllowedAssociations?: readonly string[];
    routeOverrides: Record<string, readonly string[]>;
}
export declare function isKnownAuthorAssociation(association: string): boolean;
export declare function parseAccessPolicy(raw: string): AccessPolicy;
export declare function getAllowedAssociationsForRoute(policy: AccessPolicy, route: string, isPublicRepo: boolean): string[];
export declare function isAssociationAllowedForRoute(policy: AccessPolicy, route: string, association: string, isPublicRepo: boolean): boolean;
//# sourceMappingURL=access-policy.d.ts.map