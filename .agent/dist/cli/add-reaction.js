"use strict";
// CLI: add a reaction to a GitHub node.
// Usage: node .agent/dist/cli/add-reaction.js
// Env: REACTION_SUBJECT_ID, REACTION_CONTENT (e.g., "EYES", "THUMBS_UP")
// Non-fatal: exits 0 even if the reaction fails.
Object.defineProperty(exports, "__esModule", { value: true });
const reactions_js_1 = require("../reactions.js");
const subjectId = process.env.REACTION_SUBJECT_ID || "";
const content = process.env.REACTION_CONTENT || "";
if (!subjectId) {
    console.log("No REACTION_SUBJECT_ID; skipping reaction.");
}
else if (!content) {
    console.log("No REACTION_CONTENT; skipping reaction.");
}
else {
    try {
        (0, reactions_js_1.addReaction)(subjectId, content);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Could not add ${content} reaction: ${msg}`);
    }
}
//# sourceMappingURL=add-reaction.js.map