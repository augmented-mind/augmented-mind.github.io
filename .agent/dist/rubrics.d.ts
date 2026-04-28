export declare const RUBRICS_SCHEMA_VERSION = 1;
export declare const RUBRICS_ROOT_DIR = "rubrics";
export declare const RUBRICS_README = "README.md";
export declare const RUBRIC_TYPES: readonly ["generic", "specific"];
export type RubricType = typeof RUBRIC_TYPES[number];
export declare const RUBRIC_DOMAINS: readonly ["coding_style", "coding_workflow", "communication", "review_quality"];
export type RubricDomain = typeof RUBRIC_DOMAINS[number];
export declare const RUBRIC_SEVERITIES: readonly ["must", "should", "consider"];
export type RubricSeverity = typeof RUBRIC_SEVERITIES[number];
export declare const RUBRIC_STATUSES: readonly ["active", "draft", "retired"];
export type RubricStatus = typeof RUBRIC_STATUSES[number];
export declare const RUBRIC_ROUTE_NAMES: readonly ["answer", "implement", "create-action", "fix-pr", "review", "skill", "rubrics-review", "rubrics-initialization", "rubrics-update"];
export type RubricRouteName = typeof RUBRIC_ROUTE_NAMES[number];
export interface RubricExample {
    source: string;
    note: string;
}
export interface Rubric {
    schema_version: number;
    id: string;
    title: string;
    description: string;
    type: RubricType;
    domain: RubricDomain;
    applies_to: RubricRouteName[];
    severity: RubricSeverity;
    weight: number;
    status: RubricStatus;
    examples: RubricExample[];
    path: string;
    absolutePath: string;
}
export interface RubricValidationError {
    path: string;
    message: string;
}
export interface RubricLoadResult {
    rubrics: Rubric[];
    errors: RubricValidationError[];
}
export interface RubricSelectionResult {
    rubric: Rubric;
    score: number;
    matchedTerms: string[];
}
export interface RubricSearchOptions {
    rootDir: string;
    route: string;
    query?: string;
    limit?: number;
    includeDraft?: boolean;
    allRoutes?: boolean;
    domains?: RubricDomain[];
}
export interface EnsureRubricsStructureResult {
    createdFiles: string[];
}
export declare function ensureRubricsStructure(rootDir: string, repoSlug: string): EnsureRubricsStructureResult;
export declare function loadRubrics(rootDir: string): RubricLoadResult;
export declare function tokenizeRubricQuery(query: string): string[];
export declare function selectRubrics(options: RubricSearchOptions): {
    selected: RubricSelectionResult[];
    errors: RubricValidationError[];
};
export declare function formatRubricsForPrompt(selected: RubricSelectionResult[]): string;
//# sourceMappingURL=rubrics.d.ts.map