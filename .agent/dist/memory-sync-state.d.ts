export declare const MEMORY_SYNC_STATE_SCHEMA_VERSION = 1;
export declare const MEMORY_SYNC_STATE_REF = "refs/agent-memory-state/sync";
export interface MemorySyncCursors {
    issues: string;
    pulls: string;
    discussions: string;
    commits: string;
}
export interface MemorySyncState {
    schema_version: number;
    repo_slug: string;
    last_sync_at: string;
    last_activity_at: string;
    cursors: MemorySyncCursors;
    last_run_url: string;
    created_at: string;
    updated_at: string;
}
export interface MemorySyncStateUpdates {
    last_sync_at?: string;
    last_activity_at?: string;
    cursors?: Partial<MemorySyncCursors>;
    last_run_url?: string;
}
export interface PushOptions {
    remote?: string;
    token?: string;
    repo?: string;
}
export declare function createMemorySyncState(repoSlug: string): MemorySyncState;
export declare function updateMemorySyncState(state: MemorySyncState, updates: MemorySyncStateUpdates): MemorySyncState;
export declare function normalizeMemorySyncState(raw: unknown): MemorySyncState | null;
export declare function fetchMemorySyncState(cwd: string, opts?: PushOptions): MemorySyncState | null;
export declare function writeMemorySyncState(state: MemorySyncState, cwd: string, opts?: PushOptions): void;
//# sourceMappingURL=memory-sync-state.d.ts.map