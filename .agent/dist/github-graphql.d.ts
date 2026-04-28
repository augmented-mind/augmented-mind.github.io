export type GraphQLVariableValue = string | number | boolean | null | undefined;
export interface GraphQLClient {
    graphql<T>(query: string, variables: Record<string, GraphQLVariableValue>): T;
}
/**
 * Calls `gh api graphql` and returns the decoded `data` payload.
 */
export declare function ghGraphqlData<T>(query: string, variables: Record<string, GraphQLVariableValue>, options?: {
    maxBuffer?: number;
}): T;
export declare function createGhGraphqlClient(options?: {
    maxBuffer?: number;
}): GraphQLClient;
//# sourceMappingURL=github-graphql.d.ts.map