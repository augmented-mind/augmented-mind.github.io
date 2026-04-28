import type { SessionPolicy } from "./session-policy.js";
export declare const SESSION_BUNDLE_SCHEMA_VERSION = 1;
export type SessionBundleMode = "auto" | "always" | "never";
export type SessionBundleRestoreStatus = "not_applicable" | "not_available" | "restored" | "failed";
export interface SessionBundleManifestFile {
    relative_path: string;
    size_bytes: number;
    sha256: string;
}
export interface SessionBundleManifest {
    schema_version: number;
    agent: string;
    thread_key: string;
    repo_slug: string;
    cwd: string;
    acpx_record_id: string;
    acpx_session_id: string;
    created_at: string;
    files: SessionBundleManifestFile[];
}
export interface SessionBundleFile extends SessionBundleManifestFile {
    absolute_path: string;
}
export interface CreatedSessionBundle {
    bundlePath: string;
    manifest: SessionBundleManifest;
    totalSizeBytes: number;
    fileCount: number;
}
export declare function parseSessionBundleMode(value: string | undefined): SessionBundleMode;
export declare function shouldUseSessionBundles(mode: SessionBundleMode, policy: SessionPolicy): boolean;
export declare function hasValidThreadTargetNumber(targetKind: string, targetNumber: number): boolean;
export declare function buildSessionBundleArtifactName(threadKey: string, runId: string): string;
export declare function formatSessionRestoreNotice(args: {
    resumeStatus?: string;
    runStatus?: string;
}): string;
export declare function discoverSessionBundleFiles(args: {
    agent: string;
    acpxRecordId: string;
    acpxSessionId: string;
    homeDir: string;
}): SessionBundleFile[];
export declare function createSessionBundle(args: {
    agent: string;
    threadKey: string;
    repoSlug: string;
    cwd: string;
    acpxRecordId: string;
    acpxSessionId: string;
    homeDir: string;
    runnerTemp?: string;
}): CreatedSessionBundle | null;
export declare function restoreSessionBundle(bundlePath: string, homeDir: string): SessionBundleManifest;
export declare function findSessionBundleArchive(dir: string): string | null;
//# sourceMappingURL=session-bundle.d.ts.map