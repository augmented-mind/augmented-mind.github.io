export declare const GITHUB_DIR = "github";
export declare const DAILY_DIR = "daily";
export declare const MEMORY_README: string;
export interface EnsureMemoryStructureResult {
    createdFiles: string[];
}
/**
 * Creates the memory branch layout and seeds README.md, PROJECT.md, and
 * MEMORY.md if missing. Idempotent.
 */
export declare function ensureMemoryStructure(rootDir: string, repoSlug: string): EnsureMemoryStructureResult;
export declare function issueArtifactPath(rootDir: string, number: number): string;
export declare function pullRequestArtifactPath(rootDir: string, number: number): string;
export declare function discussionArtifactPath(rootDir: string, number: number): string;
/**
 * Writes `content` to `path` iff it would change the file. Returns whether
 * an on-disk write happened.
 */
export declare function writeFileIfChanged(path: string, content: string): boolean;
//# sourceMappingURL=memory-artifacts.d.ts.map