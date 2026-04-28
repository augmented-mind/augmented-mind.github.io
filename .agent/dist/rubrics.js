"use strict";
// Rubric storage and retrieval helpers.
//
// Rubrics are user/team-owned normative preferences, stored on a dedicated
// agent/rubrics branch. They are deliberately separate from agent memory:
// memory records context the agent learns; rubrics encode what users want the
// agent to optimize for and be reviewed against.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUBRIC_ROUTE_NAMES = exports.RUBRIC_STATUSES = exports.RUBRIC_SEVERITIES = exports.RUBRIC_DOMAINS = exports.RUBRIC_TYPES = exports.RUBRICS_README = exports.RUBRICS_ROOT_DIR = exports.RUBRICS_SCHEMA_VERSION = void 0;
exports.ensureRubricsStructure = ensureRubricsStructure;
exports.loadRubrics = loadRubrics;
exports.tokenizeRubricQuery = tokenizeRubricQuery;
exports.selectRubrics = selectRubrics;
exports.formatRubricsForPrompt = formatRubricsForPrompt;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = __importDefault(require("yaml"));
exports.RUBRICS_SCHEMA_VERSION = 1;
exports.RUBRICS_ROOT_DIR = "rubrics";
exports.RUBRICS_README = "README.md";
exports.RUBRIC_TYPES = ["generic", "specific"];
exports.RUBRIC_DOMAINS = [
    "coding_style",
    "coding_workflow",
    "communication",
    "review_quality",
];
exports.RUBRIC_SEVERITIES = ["must", "should", "consider"];
exports.RUBRIC_STATUSES = ["active", "draft", "retired"];
exports.RUBRIC_ROUTE_NAMES = [
    "answer",
    "implement",
    "create-action",
    "fix-pr",
    "review",
    "skill",
    "rubrics-review",
    "rubrics-initialization",
    "rubrics-update",
];
const VALID_ID = /^[a-z0-9][a-z0-9-]*$/;
const DEFAULT_LIMIT = 10;
const VALID_TYPE_SET = new Set(exports.RUBRIC_TYPES);
const VALID_DOMAIN_SET = new Set(exports.RUBRIC_DOMAINS);
const VALID_SEVERITY_SET = new Set(exports.RUBRIC_SEVERITIES);
const VALID_STATUS_SET = new Set(exports.RUBRIC_STATUSES);
const VALID_ROUTE_SET = new Set(exports.RUBRIC_ROUTE_NAMES);
function toPosixPath(value) {
    return value.split(node_path_1.sep).join("/");
}
function ensureDirectory(path) {
    (0, node_fs_1.mkdirSync)(path, { recursive: true });
}
function ensureFile(path, content, createdFiles) {
    if ((0, node_fs_1.existsSync)(path))
        return;
    ensureDirectory((0, node_path_1.dirname)(path));
    (0, node_fs_1.writeFileSync)(path, content, "utf8");
    createdFiles.push(path);
}
function ensureRubricsStructure(rootDir, repoSlug) {
    const createdFiles = [];
    const root = (0, node_path_1.resolve)(rootDir);
    for (const domain of ["coding", "communication", "workflow"]) {
        ensureDirectory((0, node_path_1.join)(root, exports.RUBRICS_ROOT_DIR, domain));
        ensureFile((0, node_path_1.join)(root, exports.RUBRICS_ROOT_DIR, domain, ".gitkeep"), "", createdFiles);
    }
    ensureFile((0, node_path_1.join)(root, exports.RUBRICS_README), [
        "# Agent rubrics",
        "",
        `This branch stores user/team-owned rubrics for ${repoSlug || "this repository"}.`,
        "",
        "Rubrics are normative preferences used to steer implementation and evaluate reviews.",
        "They are separate from `agent/memory`, which stores agent/project continuity.",
        "",
        "Each active rubric is a YAML file under `rubrics/`.",
        "",
    ].join("\n"), createdFiles);
    return { createdFiles };
}
function collectYamlFiles(rootDir) {
    const root = (0, node_path_1.resolve)(rootDir);
    const rubricsRoot = (0, node_path_1.join)(root, exports.RUBRICS_ROOT_DIR);
    if (!(0, node_fs_1.existsSync)(rubricsRoot))
        return [];
    const out = [];
    const stack = [rubricsRoot];
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
            const full = (0, node_path_1.join)(current, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === ".git")
                    continue;
                stack.push(full);
                continue;
            }
            const ext = (0, node_path_1.extname)(entry.name).toLowerCase();
            if (entry.isFile() && (ext === ".yaml" || ext === ".yml")) {
                out.push(full);
            }
        }
    }
    return out.sort();
}
function normalizeString(value) {
    return String(value || "").trim();
}
function normalizeStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((entry) => normalizeString(entry)).filter(Boolean);
}
function normalizeExamples(value) {
    if (!Array.isArray(value))
        return [];
    const examples = [];
    for (const entry of value) {
        if (!entry || typeof entry !== "object")
            continue;
        const record = entry;
        const source = normalizeString(record.source);
        const note = normalizeString(record.note);
        if (source || note)
            examples.push({ source, note });
    }
    return examples;
}
function parseRubricYaml(filePath, rootDir) {
    const raw = (0, node_fs_1.readFileSync)(filePath, "utf8");
    const parsed = yaml_1.default.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("rubric YAML must be an object");
    }
    const schemaVersion = parsed.schema_version === undefined
        ? exports.RUBRICS_SCHEMA_VERSION
        : Number(parsed.schema_version);
    const id = normalizeString(parsed.id);
    const title = normalizeString(parsed.title);
    const description = normalizeString(parsed.description);
    const type = normalizeString(parsed.type || "generic").toLowerCase();
    const rawDomain = normalizeString(parsed.domain || parsed.category || "coding_workflow").toLowerCase();
    const domain = rawDomain === "coding" ? "coding_workflow" : rawDomain;
    const severity = normalizeString(parsed.severity || "should").toLowerCase();
    const status = normalizeString(parsed.status || "active").toLowerCase();
    const appliesTo = normalizeStringArray(parsed.applies_to).map((route) => route.toLowerCase());
    const weight = parsed.weight === undefined ? 1 : Number(parsed.weight);
    if (schemaVersion !== exports.RUBRICS_SCHEMA_VERSION)
        throw new Error(`schema_version must be ${exports.RUBRICS_SCHEMA_VERSION}`);
    if (!id || !VALID_ID.test(id))
        throw new Error("id must be kebab-case and start with a letter or digit");
    if (!title)
        throw new Error("title is required");
    if (!description)
        throw new Error("description is required");
    if (!VALID_TYPE_SET.has(type))
        throw new Error(`type must be one of ${exports.RUBRIC_TYPES.join(", ")}`);
    if (!VALID_DOMAIN_SET.has(domain))
        throw new Error(`domain must be one of ${exports.RUBRIC_DOMAINS.join(", ")}`);
    if (!VALID_SEVERITY_SET.has(severity))
        throw new Error(`severity must be one of ${exports.RUBRIC_SEVERITIES.join(", ")}`);
    if (!VALID_STATUS_SET.has(status))
        throw new Error(`status must be one of ${exports.RUBRIC_STATUSES.join(", ")}`);
    if (!Number.isInteger(weight) || weight < 1 || weight > 10)
        throw new Error("weight must be an integer from 1 to 10");
    if (appliesTo.length === 0)
        throw new Error("applies_to must contain at least one route");
    for (const route of appliesTo) {
        if (!VALID_ROUTE_SET.has(route))
            throw new Error(`unsupported applies_to route: ${route}`);
    }
    return {
        schema_version: schemaVersion,
        id,
        title,
        description,
        type: type,
        domain: domain,
        applies_to: [...new Set(appliesTo)],
        severity: severity,
        weight,
        status: status,
        examples: normalizeExamples(parsed.examples),
        path: toPosixPath((0, node_path_1.relative)((0, node_path_1.resolve)(rootDir), filePath)),
        absolutePath: filePath,
    };
}
function loadRubrics(rootDir) {
    const files = collectYamlFiles(rootDir);
    const rubrics = [];
    const errors = [];
    const seenIds = new Map();
    for (const file of files) {
        try {
            const rubric = parseRubricYaml(file, rootDir);
            const previous = seenIds.get(rubric.id);
            if (previous) {
                errors.push({ path: rubric.path, message: `duplicate id ${rubric.id} also used by ${previous}` });
                continue;
            }
            seenIds.set(rubric.id, rubric.path);
            rubrics.push(rubric);
        }
        catch (err) {
            errors.push({
                path: toPosixPath((0, node_path_1.relative)((0, node_path_1.resolve)(rootDir), file)),
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    return { rubrics: rubrics.sort((a, b) => a.id.localeCompare(b.id)), errors };
}
function tokenizeRubricQuery(query) {
    const seen = new Set();
    return String(query || "")
        .trim()
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 || /^[0-9]+$/.test(token))
        .filter((token) => {
        if (seen.has(token))
            return false;
        seen.add(token);
        return true;
    });
}
function searchableText(rubric) {
    return [
        rubric.id,
        rubric.title,
        rubric.description,
        rubric.type,
        rubric.domain,
        rubric.severity,
        ...rubric.applies_to,
        ...rubric.examples.flatMap((example) => [example.source, example.note]),
    ].join("\n").toLowerCase();
}
function routeMatches(rubric, route) {
    const normalized = String(route || "").trim().toLowerCase();
    if (!normalized)
        return true;
    if (rubric.applies_to.includes(normalized))
        return true;
    // Rubrics for implementation also apply to the PR-fix implementation path
    // unless the author chose a more specific route list.
    return normalized === "fix-pr" && rubric.applies_to.includes("implement");
}
function severityScore(severity) {
    switch (severity) {
        case "must": return 30;
        case "should": return 20;
        case "consider": return 10;
    }
}
function selectRubrics(options) {
    const { rubrics, errors } = loadRubrics(options.rootDir);
    const tokens = tokenizeRubricQuery(options.query || "");
    const limit = Math.max(1, options.limit ?? DEFAULT_LIMIT);
    const domainFilter = new Set(options.domains || []);
    const selected = [];
    for (const rubric of rubrics) {
        if (rubric.status === "retired")
            continue;
        if (rubric.status === "draft" && !options.includeDraft)
            continue;
        if (!options.allRoutes && !routeMatches(rubric, options.route))
            continue;
        if (domainFilter.size > 0 && !domainFilter.has(rubric.domain))
            continue;
        const text = searchableText(rubric);
        const matchedTerms = [];
        let score = severityScore(rubric.severity) + rubric.weight * 2;
        for (const token of tokens) {
            if (text.includes(token)) {
                matchedTerms.push(token);
                score += Math.max(token.length, 3) * 3;
            }
        }
        // With an empty or sparse query, active route-applicable rubrics are still
        // useful as baseline steering; rank by severity and weight.
        selected.push({ rubric, score, matchedTerms });
    }
    selected.sort((a, b) => b.score - a.score || b.rubric.weight - a.rubric.weight || a.rubric.id.localeCompare(b.rubric.id));
    return { selected: Number.isFinite(limit) ? selected.slice(0, limit) : selected, errors };
}
function formatRubricsForPrompt(selected) {
    if (selected.length === 0) {
        return "No active route-applicable rubrics were selected for this run.";
    }
    const lines = [];
    for (const entry of selected) {
        const rubric = entry.rubric;
        lines.push(`### ${rubric.title}`);
        lines.push(`- id: \`${rubric.id}\``);
        lines.push(`- domain/type: ${rubric.domain} / ${rubric.type}`);
        lines.push(`- severity/weight: ${rubric.severity} / ${rubric.weight}`);
        lines.push(`- applies to: ${rubric.applies_to.join(", ")}`);
        lines.push(`- source file: \`${rubric.path}\``);
        lines.push(`- rubric: ${rubric.description}`);
        if (entry.matchedTerms.length > 0) {
            lines.push(`- matched terms: ${entry.matchedTerms.join(", ")}`);
        }
        if (rubric.examples.length > 0) {
            const example = rubric.examples[0];
            lines.push(`- provenance: ${[example.source, example.note].filter(Boolean).join(" — ")}`);
        }
        lines.push("");
    }
    return lines.join("\n").trimEnd() + "\n";
}
//# sourceMappingURL=rubrics.js.map