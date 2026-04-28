"use strict";
// Mention parsing helpers. These functions are intentionally detached from
// any specific GitHub entity so mention-based workflows can reuse the same
// boundary-aware parsing and markdown stripping rules.
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeRegex = escapeRegex;
exports.stripNonLiveMentions = stripNonLiveMentions;
exports.buildMentionRegex = buildMentionRegex;
exports.hasLiveMention = hasLiveMention;
/**
 * Escapes user-provided mention text before building a regex around it.
 */
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Removes quoted and code-only content so mentions inside them do not
 * trigger the workflow.
 */
function stripNonLiveMentions(markdown) {
    return markdown
        .replace(/```[\s\S]*?```/g, "\n")
        .replace(/~~~[\s\S]*?~~~/g, "\n")
        .replace(/`[^`\n]*`/g, "")
        .split("\n")
        .filter((line) => !line.match(/^\s*>/))
        .join("\n");
}
/**
 * Builds the boundary-aware mention matcher used for the final trigger check.
 */
function buildMentionRegex(mention) {
    return new RegExp(`(^|[\\s(])${escapeRegex(mention)}(?=[\\s.,;:!?)\\]}]|$)`, "m");
}
/**
 * Checks whether the markdown contains a live mention after stripping
 * quoted and code-only content.
 */
function hasLiveMention(markdown, mention) {
    return buildMentionRegex(mention).test(stripNonLiveMentions(markdown));
}
//# sourceMappingURL=mentions.js.map