export declare const MAX_BUFFER: number;
export declare function gh(args: string[], cwd?: string): string;
/**
 * Runs `gh api <args>` and returns trimmed stdout. Returns "" on any
 * non-zero exit. Use for best-effort lookups where a 404 is an expected
 * answer (e.g. "is this user a collaborator?").
 */
export declare function ghApi(args: string[]): string;
/**
 * Returns true if `gh api <args>` exits 0. Use for endpoints that return
 * 204 on success (no body) and 404 on absence, where `ghApi` can't
 * distinguish the two.
 */
export declare function ghApiOk(args: string[]): boolean;
export declare function postIssueComment(issueNumber: number, body: string, repo?: string): void;
export declare function postPrComment(prNumber: number, body: string, repo?: string): void;
export interface EnsureLabelOptions {
    name: string;
    color: string;
    description: string;
    repo?: string;
}
export declare function ensureLabel(opts: EnsureLabelOptions): void;
export declare function addIssueLabel(issueNumber: number, label: string, repo?: string): void;
export declare function addPrLabel(prNumber: number, label: string, repo?: string): void;
export interface PrMeta {
    headRef: string;
    headOid: string;
    isCrossRepository: boolean;
    state: string;
}
export declare function fetchPrMeta(prNumber: number, repo?: string): PrMeta;
export declare function findExistingPr(headBranch: string, repo?: string): string | null;
export interface CreatePrOptions {
    base: string;
    head: string;
    title: string;
    bodyFile: string;
    draft?: boolean;
    repo?: string;
}
export declare function createPr(opts: CreatePrOptions): string;
export interface CreateIssueOptions {
    title: string;
    bodyFile: string;
    repo?: string;
}
export declare function createIssue(opts: CreateIssueOptions): string;
export declare function dispatchWorkflow(repo: string, workflow: string, ref: string, inputs: Record<string, string>): void;
//# sourceMappingURL=github.d.ts.map