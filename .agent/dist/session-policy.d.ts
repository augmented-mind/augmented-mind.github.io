export type SessionPolicy = "none" | "track-only" | "resume-best-effort" | "resume-required";
export type SessionMode = "exec" | "persistent";
export declare function parseSessionPolicy(value: string | undefined): SessionPolicy | null;
export declare function sessionModeForPolicy(policy: SessionPolicy): SessionMode;
export declare function tracksThreadState(policy: SessionPolicy): boolean;
export declare function attemptsResume(policy: SessionPolicy): boolean;
export declare function requiresResumeContinuity(policy: SessionPolicy): boolean;
//# sourceMappingURL=session-policy.d.ts.map