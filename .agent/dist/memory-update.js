"use strict";
// Safe, validated bullet-level edits to MEMORY.md / PROJECT.md / daily logs.
//
// The main agent composes memory during normal execution routes; this module
// is the sanctioned helper for validated bullet-level edits when the agent
// wants section placement, formatting, and dedup handled automatically.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAILY_ACTIVITY_SECTION = exports.DAILY_DIR = exports.PROJECT_FILE = exports.MEMORY_FILE = void 0;
exports.addBullet = addBullet;
exports.replaceBullet = replaceBullet;
exports.removeBullet = removeBullet;
exports.todayDateUtc = todayDateUtc;
exports.dailyLogPath = dailyLogPath;
exports.appendDailyBullet = appendDailyBullet;
exports.isEditableFile = isEditableFile;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
exports.MEMORY_FILE = "MEMORY.md";
exports.PROJECT_FILE = "PROJECT.md";
exports.DAILY_DIR = "daily";
exports.DAILY_ACTIVITY_SECTION = "Activity";
const LOCK_TIMEOUT_MS = 5_000;
const LOCK_POLL_MS = 50;
const STALE_LOCK_MS = 30_000;
const PREVIEW_CHARS = 120;
const LOCK_SLEEP_ARRAY = new Int32Array(new SharedArrayBuffer(4));
function normalizeBullet(raw) {
    const collapsed = String(raw || "")
        .replace(/\r/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!collapsed)
        return "";
    const stripped = collapsed.replace(/^[-*+]\s+/, "");
    if (!stripped)
        return "";
    return `- ${stripped}`;
}
function sectionHeader(name) {
    return `## ${name}`;
}
function titleForEditableFile(file) {
    return file === exports.MEMORY_FILE ? "Memory" : "Project";
}
function seedEmptyEditableFile(file, section) {
    return [`# ${titleForEditableFile(file)}`, "", sectionHeader(section)];
}
function findSection(lines, name) {
    const header = sectionHeader(name).trim();
    const headerIndex = lines.findIndex((line) => line.trim() === header);
    if (headerIndex === -1)
        return null;
    let bodyEnd = lines.length;
    for (let i = headerIndex + 1; i < lines.length; i += 1) {
        if (/^##\s+/.test(lines[i])) {
            bodyEnd = i;
            break;
        }
    }
    return { headerIndex, bodyStart: headerIndex + 1, bodyEnd };
}
function bulletsInSpan(lines, span) {
    return lines
        .slice(span.bodyStart, span.bodyEnd)
        .filter((line) => /^[-*+]\s+/.test(line.trim()))
        .map((line) => normalizeBullet(line));
}
function bulletPreview(text) {
    return text.length > PREVIEW_CHARS
        ? `${text.slice(0, PREVIEW_CHARS - 1).trimEnd()}…`
        : text;
}
function findBulletMatches(lines, span, needle) {
    const out = [];
    for (let i = span.bodyStart; i < span.bodyEnd; i += 1) {
        const line = lines[i];
        if (!/^[-*+]\s+/.test(line.trim()))
            continue;
        if (line.toLowerCase().includes(needle)) {
            out.push({ index: i, normalized: normalizeBullet(line) });
        }
    }
    return out;
}
function readLines(path) {
    if (!(0, node_fs_1.existsSync)(path))
        return [];
    const content = (0, node_fs_1.readFileSync)(path, "utf8").replace(/\r/g, "");
    const lines = content.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "")
        lines.pop();
    return lines;
}
function writeLines(path, lines) {
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(path), { recursive: true });
    const tempPath = (0, node_path_1.join)((0, node_path_1.dirname)(path), `.${(0, node_path_1.basename)(path)}.${process.pid}.${Date.now()}.tmp`);
    (0, node_fs_1.writeFileSync)(tempPath, lines.join("\n") + "\n", "utf8");
    (0, node_fs_1.renameSync)(tempPath, path);
}
function sleepMs(ms) {
    Atomics.wait(LOCK_SLEEP_ARRAY, 0, 0, ms);
}
function withFileLock(path, fn) {
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(path), { recursive: true });
    const lockPath = `${path}.lock`;
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    while (true) {
        let fd = null;
        try {
            fd = (0, node_fs_1.openSync)(lockPath, "wx");
            try {
                return fn();
            }
            finally {
                (0, node_fs_1.closeSync)(fd);
                fd = null;
                (0, node_fs_1.rmSync)(lockPath, { force: true });
            }
        }
        catch (error) {
            if (fd !== null) {
                try {
                    (0, node_fs_1.closeSync)(fd);
                }
                catch { /* ignore */ }
            }
            const code = error?.code;
            if (code !== "EEXIST")
                throw error;
            try {
                const ageMs = Date.now() - (0, node_fs_1.statSync)(lockPath).mtimeMs;
                if (ageMs > STALE_LOCK_MS) {
                    (0, node_fs_1.rmSync)(lockPath, { force: true });
                    continue;
                }
            }
            catch {
                // statSync failed — most commonly because the lock holder released
                // the lockfile between our openSync and statSync. Retry the loop;
                // we'll likely acquire the lock on the next iteration.
                continue;
            }
            if (Date.now() >= deadline) {
                throw new Error(`Timed out waiting for memory lock: ${lockPath}`);
            }
            sleepMs(LOCK_POLL_MS);
        }
    }
}
function assertBullet(bullet) {
    const normalized = normalizeBullet(bullet);
    if (!normalized)
        throw new Error("Bullet text must be non-empty");
    return normalized;
}
function addBullet(options, bullet) {
    const path = (0, node_path_1.join)(options.root, options.file);
    const normalized = assertBullet(bullet);
    return withFileLock(path, () => {
        const lines = readLines(path);
        const seededLines = lines.length === 0
            ? seedEmptyEditableFile(options.file, options.section)
            : lines;
        const span = findSection(seededLines, options.section);
        if (!span) {
            return { action: { kind: "missing_section", section: options.section }, file: path };
        }
        const existing = new Set(bulletsInSpan(seededLines, span));
        if (existing.has(normalized)) {
            return { action: { kind: "noop", reason: "duplicate" }, file: path };
        }
        const insertAt = span.bodyEnd;
        const nextLines = [
            ...seededLines.slice(0, insertAt),
            normalized,
            ...seededLines.slice(insertAt),
        ];
        writeLines(path, nextLines);
        return { action: { kind: "added" }, file: path };
    });
}
function replaceBullet(options, match, replacement) {
    const path = (0, node_path_1.join)(options.root, options.file);
    const normalizedReplacement = assertBullet(replacement);
    const needle = String(match || "").trim().toLowerCase();
    if (!needle)
        throw new Error("--match is required for replace");
    return withFileLock(path, () => {
        const lines = readLines(path);
        const span = findSection(lines, options.section);
        if (!span) {
            return { action: { kind: "missing_section", section: options.section }, file: path };
        }
        const matches = findBulletMatches(lines, span, needle);
        if (matches.length === 0) {
            return { action: { kind: "missing_match", match }, file: path };
        }
        const uniqueMatches = new Set(matches.map((entry) => entry.normalized));
        if (uniqueMatches.size > 1) {
            return {
                action: {
                    kind: "ambiguous_match",
                    match,
                    candidates: Array.from(uniqueMatches, (entry) => bulletPreview(entry)),
                },
                file: path,
            };
        }
        const matchIndex = matches[0].index;
        const currentNormalized = matches[0].normalized;
        if (currentNormalized === normalizedReplacement) {
            return { action: { kind: "noop", reason: "duplicate" }, file: path };
        }
        const replacementExists = matchesInSpan(lines, span, normalizedReplacement)
            .some((index) => index !== matchIndex);
        if (replacementExists) {
            lines.splice(matchIndex, 1);
            writeLines(path, lines);
            return { action: { kind: "deduped" }, file: path };
        }
        lines[matchIndex] = normalizedReplacement;
        writeLines(path, lines);
        return { action: { kind: "replaced" }, file: path };
    });
}
function removeBullet(options, match) {
    const path = (0, node_path_1.join)(options.root, options.file);
    const needle = String(match || "").trim().toLowerCase();
    if (!needle)
        throw new Error("--match is required for remove");
    return withFileLock(path, () => {
        const lines = readLines(path);
        const span = findSection(lines, options.section);
        if (!span) {
            return { action: { kind: "missing_section", section: options.section }, file: path };
        }
        const matches = findBulletMatches(lines, span, needle);
        if (matches.length === 0) {
            return { action: { kind: "missing_match", match }, file: path };
        }
        const uniqueMatches = new Set(matches.map((entry) => entry.normalized));
        if (uniqueMatches.size > 1) {
            return {
                action: {
                    kind: "ambiguous_match",
                    match,
                    candidates: Array.from(uniqueMatches, (entry) => bulletPreview(entry)),
                },
                file: path,
            };
        }
        lines.splice(matches[0].index, 1);
        writeLines(path, lines);
        return { action: { kind: "removed" }, file: path };
    });
}
function todayDateUtc(now = new Date()) {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function dailyLogPath(root, date) {
    return (0, node_path_1.join)(root, exports.DAILY_DIR, `${date}.md`);
}
function ensureDailyLog(path, date) {
    if ((0, node_fs_1.existsSync)(path))
        return readLines(path);
    const lines = [
        `# Daily log for ${date}`,
        "",
        sectionHeader(exports.DAILY_ACTIVITY_SECTION),
    ];
    writeLines(path, lines);
    return lines;
}
function appendDailyBullet(root, bullet, dateOverride) {
    const date = dateOverride || todayDateUtc();
    const path = dailyLogPath(root, date);
    const normalized = assertBullet(bullet);
    return withFileLock(path, () => {
        const lines = ensureDailyLog(path, date);
        const span = findSection(lines, exports.DAILY_ACTIVITY_SECTION);
        if (!span) {
            // ensureDailyLog just wrote the header, so this is a structural bug.
            throw new Error(`Daily log at ${path} is missing section: ${exports.DAILY_ACTIVITY_SECTION}`);
        }
        const existing = new Set(bulletsInSpan(lines, span));
        if (existing.has(normalized)) {
            return { action: { kind: "noop", reason: "duplicate" }, file: path };
        }
        const insertAt = span.bodyEnd;
        const nextLines = [
            ...lines.slice(0, insertAt),
            normalized,
            ...lines.slice(insertAt),
        ];
        writeLines(path, nextLines);
        return { action: { kind: "added" }, file: path };
    });
}
function isEditableFile(name) {
    return name === exports.MEMORY_FILE || name === exports.PROJECT_FILE;
}
function matchesInSpan(lines, span, normalizedBullet) {
    const out = [];
    for (let i = span.bodyStart; i < span.bodyEnd; i += 1) {
        const line = lines[i];
        if (!/^[-*+]\s+/.test(line.trim()))
            continue;
        if (normalizeBullet(line) === normalizedBullet)
            out.push(i);
    }
    return out;
}
//# sourceMappingURL=memory-update.js.map