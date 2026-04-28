"use strict";
// Shared GitHub Actions output helper.
//
// Uses HEREDOC delimiters for all values, which is safe for multiline
// content. Replaces the per-file setOutput implementations that were
// inconsistent (some used bare key=value, breaking on newlines).
Object.defineProperty(exports, "__esModule", { value: true });
exports.setOutput = setOutput;
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
/**
 * Writes a key-value pair to the GITHUB_OUTPUT file.
 * Uses HEREDOC delimiters so multiline values are handled correctly.
 */
function setOutput(name, value) {
    const outputFile = process.env.GITHUB_OUTPUT;
    if (!outputFile)
        return;
    const delim = `DELIM_${(0, node_crypto_1.randomBytes)(8).toString("hex")}`;
    (0, node_fs_1.appendFileSync)(outputFile, `${name}<<${delim}\n${value}\n${delim}\n`);
}
//# sourceMappingURL=output.js.map