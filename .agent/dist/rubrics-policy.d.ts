export declare const RUBRICS_MODES: readonly ["enabled", "read-only", "disabled"];
export type RubricsMode = typeof RUBRICS_MODES[number];
export declare const DEFAULT_RUBRICS_MODE: RubricsMode;
export declare const RUBRICS_HARD_DISABLED_ROUTES: readonly ["dispatch"];
export interface RubricsPolicy {
    defaultMode: RubricsMode;
    routeOverrides: Record<string, RubricsMode>;
}
export declare function parseRubricsPolicy(raw: string): RubricsPolicy;
export declare function getRubricsModeForRoute(policy: RubricsPolicy, route: string): RubricsMode;
export declare function isRubricsHardDisabledRoute(route: string): boolean;
export declare function rubricsModeAllowsRead(mode: RubricsMode): boolean;
export declare function rubricsModeAllowsWrite(mode: RubricsMode): boolean;
export declare function isRubricsMode(value: unknown): value is RubricsMode;
//# sourceMappingURL=rubrics-policy.d.ts.map