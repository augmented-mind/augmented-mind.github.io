export interface MemorySearchLineMatch {
    lineNumber: number;
    text: string;
    score: number;
    matchCount: number;
}
export interface MemorySearchResult {
    path: string;
    absolutePath: string;
    score: number;
    matchCount: number;
    matchedTerms: string[];
    snippets: MemorySearchLineMatch[];
}
export interface MemorySearchOptions {
    rootDir: string;
    limit?: number;
    snippetsPerFile?: number;
    maxFileSizeBytes?: number;
}
export declare function tokenizeMemorySearchQuery(query: string): string[];
export declare function searchMemory(query: string, options: MemorySearchOptions): MemorySearchResult[];
export declare function formatMemorySearchResults(query: string, results: MemorySearchResult[], rootDir: string): string;
//# sourceMappingURL=memory-search.d.ts.map