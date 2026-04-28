export interface RuntimeEnvelope {
    schema_version: number;
    repo_slug: string;
    route: string;
    source_kind: string;
    target_kind: string;
    target_number: number;
    target_url: string;
    request_text: string;
    requested_by: string;
    approval_comment_url: string | null;
    workflow: string;
    lane: string;
    thread_key: string;
}
export interface EventContext {
    body: string;
    sourceKind: string;
    targetKind: string;
    targetNumber: string;
    targetUrl: string;
}
export interface RuntimeParams {
    repo_slug: string;
    route: string;
    requested_by: string;
    approval_comment_url?: string | null;
    workflow?: string;
    lane?: string;
}
export interface EnvelopeParams {
    repo_slug: string;
    route: string;
    source_kind: string;
    target_kind: string;
    target_number: number;
    target_url: string;
    request_text?: string;
    requested_by: string;
    approval_comment_url?: string | null;
    workflow?: string;
    lane?: string;
}
export declare const SCHEMA_VERSION = 1;
export declare const DEFAULT_LANE = "default";
export declare const VALID_ROUTES: Set<string>;
export declare const VALID_SOURCE_KINDS: Set<string>;
export declare const VALID_TARGET_KINDS: Set<string>;
export declare const REQUIRED_FIELDS: readonly ["repo_slug", "route", "source_kind", "target_kind", "target_number", "target_url", "requested_by"];
export declare function buildThreadKey(params: {
    repo_slug: string;
    target_kind: string;
    target_number: number;
    route: string;
    lane?: string;
}): string;
export declare function buildEnvelope(params: EnvelopeParams): RuntimeEnvelope;
export declare function validateEnvelope(envelope: RuntimeEnvelope | null | undefined): string[];
export declare function buildEnvelopeFromEventContext(eventContext: EventContext, runtime: RuntimeParams): RuntimeEnvelope;
export declare function envelopeToPromptVars(envelope: RuntimeEnvelope): Record<string, string>;
//# sourceMappingURL=envelope.d.ts.map