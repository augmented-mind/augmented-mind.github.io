export declare const MEMORY_FILE = "MEMORY.md";
export declare const PROJECT_FILE = "PROJECT.md";
export declare const DAILY_DIR = "daily";
export declare const DAILY_ACTIVITY_SECTION = "Activity";
export type EditableFile = typeof MEMORY_FILE | typeof PROJECT_FILE;
export type UpdateAction = {
    kind: "added";
} | {
    kind: "deduped";
} | {
    kind: "noop";
    reason: "duplicate";
} | {
    kind: "replaced";
} | {
    kind: "removed";
} | {
    kind: "missing_section";
    section: string;
} | {
    kind: "missing_match";
    match: string;
} | {
    kind: "ambiguous_match";
    match: string;
    candidates: string[];
};
export interface UpdateResult {
    action: UpdateAction;
    file: string;
}
export interface EditOptions {
    root: string;
    file: EditableFile;
    section: string;
}
export declare function addBullet(options: EditOptions, bullet: string): UpdateResult;
export declare function replaceBullet(options: EditOptions, match: string, replacement: string): UpdateResult;
export declare function removeBullet(options: EditOptions, match: string): UpdateResult;
export declare function todayDateUtc(now?: Date): string;
export declare function dailyLogPath(root: string, date: string): string;
export declare function appendDailyBullet(root: string, bullet: string, dateOverride?: string): UpdateResult;
export declare function isEditableFile(name: string): name is EditableFile;
//# sourceMappingURL=memory-update.d.ts.map