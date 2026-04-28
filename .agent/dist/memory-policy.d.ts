export declare const MEMORY_MODES: readonly ["enabled", "read-only", "disabled"];
export type MemoryMode = typeof MEMORY_MODES[number];
export declare const DEFAULT_MEMORY_MODE: MemoryMode;
export interface MemoryPolicy {
    defaultMode: MemoryMode;
    routeOverrides: Record<string, MemoryMode>;
}
export declare function parseMemoryPolicy(raw: string): MemoryPolicy;
export declare function getMemoryModeForRoute(policy: MemoryPolicy, route: string): MemoryMode;
export declare function memoryModeAllowsRead(mode: MemoryMode): boolean;
export declare function memoryModeAllowsWrite(mode: MemoryMode): boolean;
export declare function isMemoryMode(value: unknown): value is MemoryMode;
//# sourceMappingURL=memory-policy.d.ts.map