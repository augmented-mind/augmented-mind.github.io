"use strict";
// Filesystem text search over a memory directory tree.
//
// Intentionally simple: no pre-built index, no stemming. The memory tree is
// small enough (MB range) that walking it per query is fine, and we avoid a
// stale-index class of bugs. The agent invokes this on demand through the
// cli/memory/search.js CLI.
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenizeMemorySearchQuery = tokenizeMemorySearchQuery;
exports.searchMemory = searchMemory;
exports.formatMemorySearchResults = formatMemorySearchResults;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const DEFAULT_LIMIT = 5;
const DEFAULT_SNIPPETS_PER_FILE = 3;
const DEFAULT_MAX_FILE_SIZE_BYTES = 512 * 1024;
const PATH_MATCH_WEIGHT = 6;
const PHRASE_MATCH_WEIGHT = 3;
const SKIPPED_DIRECTORIES = new Set([
    ".git",
    ".hg",
    ".svn",
    "node_modules",
]);
const TEXT_FILE_EXTENSIONS = new Set([
    ".md",
    ".markdown",
    ".txt",
    ".json",
    ".jsonl",
    ".yaml",
    ".yml",
    ".csv",
    ".tsv",
    ".log",
]);
function toPosixPath(value) {
    return value.split(node_path_1.sep).join("/");
}
function countOccurrences(haystack, needle) {
    if (!haystack || !needle)
        return 0;
    let count = 0;
    let fromIndex = 0;
    while (fromIndex < haystack.length) {
        const index = haystack.indexOf(needle, fromIndex);
        if (index === -1)
            break;
        count += 1;
        fromIndex = index + Math.max(needle.length, 1);
    }
    return count;
}
function normalizeSearchPhrase(query) {
    return String(query || "").trim().toLowerCase();
}
function tokenizeMemorySearchQuery(query) {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized)
        return [];
    const seen = new Set();
    const tokens = normalized
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 || /^[0-9]+$/.test(token))
        .filter((token) => {
        if (seen.has(token))
            return false;
        seen.add(token);
        return true;
    });
    if (tokens.length > 0)
        return tokens;
    return normalized.length >= 2 ? [normalized] : [];
}
function collectSearchableFiles(rootDir) {
    const files = [];
    const stack = [rootDir];
    while (stack.length > 0) {
        const current = stack.pop();
        let entries;
        try {
            entries = (0, node_fs_1.readdirSync)(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const fullPath = (0, node_path_1.join)(current, entry.name);
            if (entry.isDirectory()) {
                if (SKIPPED_DIRECTORIES.has(entry.name))
                    continue;
                stack.push(fullPath);
                continue;
            }
            if (entry.isFile())
                files.push(fullPath);
        }
    }
    return files.sort();
}
function readTextFile(filePath, maxFileSizeBytes) {
    const stat = (0, node_fs_1.statSync)(filePath);
    if (!stat.isFile() || stat.size > maxFileSizeBytes)
        return null;
    const extension = (0, node_path_1.extname)(filePath).toLowerCase();
    const buffer = (0, node_fs_1.readFileSync)(filePath);
    if (!TEXT_FILE_EXTENSIONS.has(extension) && buffer.includes(0))
        return null;
    return buffer.toString("utf8");
}
function summarizeLine(text, maxLength = 220) {
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxLength)
        return collapsed;
    return collapsed.slice(0, maxLength).trimEnd() + "…";
}
function scoreLine(line, tokens) {
    const lower = line.toLowerCase();
    let score = 0;
    let count = 0;
    const terms = [];
    for (const token of tokens) {
        const occurrences = countOccurrences(lower, token);
        if (occurrences > 0) {
            score += occurrences * Math.max(token.length, 2);
            count += occurrences;
            terms.push(token);
        }
    }
    return { score, count, terms };
}
function scorePath(pathValue, tokens) {
    const lower = pathValue.toLowerCase();
    let score = 0;
    let count = 0;
    const terms = [];
    for (const token of tokens) {
        const occurrences = countOccurrences(lower, token);
        if (occurrences > 0) {
            score += occurrences * Math.max(token.length, 2) * PATH_MATCH_WEIGHT;
            count += occurrences;
            terms.push(token);
        }
    }
    return { score, count, terms };
}
function searchMemory(query, options) {
    const tokens = tokenizeMemorySearchQuery(query);
    if (tokens.length === 0)
        return [];
    const root = (0, node_path_1.resolve)(options.rootDir);
    if (!(0, node_fs_1.existsSync)(root)) {
        throw new Error(`Memory directory not found: ${root}`);
    }
    if (!(0, node_fs_1.statSync)(root).isDirectory()) {
        throw new Error(`Memory path is not a directory: ${root}`);
    }
    const limit = Math.max(1, options.limit ?? DEFAULT_LIMIT);
    const snippetsPerFile = Math.max(1, options.snippetsPerFile ?? DEFAULT_SNIPPETS_PER_FILE);
    const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
    const phrase = normalizeSearchPhrase(query);
    const files = collectSearchableFiles(root);
    const results = [];
    for (const filePath of files) {
        let content;
        try {
            content = readTextFile(filePath, maxFileSizeBytes);
        }
        catch {
            continue;
        }
        if (!content)
            continue;
        const lines = content.split(/\r?\n/);
        const lineMatches = [];
        const relativePath = toPosixPath((0, node_path_1.relative)(root, filePath)) || (0, node_path_1.basename)(filePath);
        const pathScored = scorePath(relativePath, tokens);
        let fileScore = pathScored.score;
        let fileMatches = pathScored.count;
        const termsSeen = new Set();
        for (const term of pathScored.terms)
            termsSeen.add(term);
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            if (!line.trim())
                continue;
            const scored = scoreLine(line, tokens);
            const phraseCount = phrase.length >= 2 ? countOccurrences(line.toLowerCase(), phrase) : 0;
            if (phraseCount > 0) {
                scored.score += phraseCount * Math.max(phrase.length, 4) * PHRASE_MATCH_WEIGHT;
                scored.count += phraseCount;
            }
            if (scored.count === 0)
                continue;
            fileScore += scored.score;
            fileMatches += scored.count;
            for (const term of scored.terms)
                termsSeen.add(term);
            lineMatches.push({
                lineNumber: index + 1,
                text: summarizeLine(line),
                score: scored.score,
                matchCount: scored.count,
            });
        }
        if (lineMatches.length === 0) {
            if (pathScored.score === 0)
                continue;
            lineMatches.push({
                lineNumber: 0,
                text: "(matched by filename)",
                score: pathScored.score,
                matchCount: pathScored.count,
            });
        }
        // Prefer lines matching more distinct terms first, then higher score.
        lineMatches.sort((a, b) => b.score - a.score || a.lineNumber - b.lineNumber);
        results.push({
            path: relativePath,
            absolutePath: filePath,
            score: fileScore,
            matchCount: fileMatches,
            matchedTerms: Array.from(termsSeen),
            snippets: lineMatches.slice(0, snippetsPerFile),
        });
    }
    results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    return results.slice(0, limit);
}
function formatMemorySearchResults(query, results, rootDir) {
    const header = `Memory search: "${query}"  (${results.length} file${results.length === 1 ? "" : "s"} in ${(0, node_path_1.resolve)(rootDir)})\n`;
    if (results.length === 0) {
        return `${header}\n_No matches found._\n`;
    }
    const body = results
        .map((result) => {
        const lines = [
            `\n## ${result.path}  (score=${result.score}, matches=${result.matchCount})`,
            `Matched terms: ${result.matchedTerms.join(", ") || "(none)"}`,
        ];
        for (const snippet of result.snippets) {
            lines.push(snippet.lineNumber > 0
                ? `  L${snippet.lineNumber}: ${snippet.text}`
                : `  Path match: ${snippet.text}`);
        }
        return lines.join("\n");
    })
        .join("\n");
    return `${header}${body}\n`;
}
//# sourceMappingURL=memory-search.js.map