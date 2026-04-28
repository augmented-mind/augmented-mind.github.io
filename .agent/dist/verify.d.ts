export interface VerifyResult {
    exitCode: number;
    output: string;
}
export interface VerifyOptions {
    /** Optional base commit used to verify clean history-only HEAD updates. */
    baseSha?: string;
}
export declare function shouldRunVerification(hasWorktreeChanges: boolean, hasBranchUpdate: boolean): boolean;
/**
 * Runs the verification script. Returns exit code 0 if verification passed.
 */
export declare function runVerification(cwd: string, options?: VerifyOptions): VerifyResult;
//# sourceMappingURL=verify.d.ts.map