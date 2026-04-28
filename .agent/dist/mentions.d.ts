/**
 * Escapes user-provided mention text before building a regex around it.
 */
export declare function escapeRegex(text: string): string;
/**
 * Removes quoted and code-only content so mentions inside them do not
 * trigger the workflow.
 */
export declare function stripNonLiveMentions(markdown: string): string;
/**
 * Builds the boundary-aware mention matcher used for the final trigger check.
 */
export declare function buildMentionRegex(mention: string): RegExp;
/**
 * Checks whether the markdown contains a live mention after stripping
 * quoted and code-only content.
 */
export declare function hasLiveMention(markdown: string, mention: string): boolean;
//# sourceMappingURL=mentions.d.ts.map