"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const mentions_js_1 = require("../mentions.js");
const MENTION = "@sepo-agent";
(0, node_test_1.test)("stripNonLiveMentions removes quoted text and fenced code", () => {
    const md = [
        "Look at this:",
        "```",
        `${MENTION} in a code block`,
        "```",
        `> ${MENTION} in a quote`,
        `Normal text here`,
        `Inline code \`${MENTION}\` here`,
    ].join("\n");
    const stripped = (0, mentions_js_1.stripNonLiveMentions)(md);
    node_assert_1.strict.ok(!stripped.includes("code block"), "code block should be stripped");
    node_assert_1.strict.ok(!stripped.includes("in a quote"), "quoted line should be stripped");
    node_assert_1.strict.ok(!stripped.includes(MENTION), "inline code mention should be stripped");
    node_assert_1.strict.ok(stripped.includes("Normal text"), "plain text should survive");
    node_assert_1.strict.ok(stripped.includes("Inline code"), "text around inline code should survive");
});
(0, node_test_1.test)("hasLiveMention enforces mention boundaries", () => {
    node_assert_1.strict.ok((0, mentions_js_1.hasLiveMention)(`Please ${MENTION} review this`, MENTION));
    node_assert_1.strict.ok((0, mentions_js_1.hasLiveMention)(`${MENTION} review this`, MENTION));
    node_assert_1.strict.ok((0, mentions_js_1.hasLiveMention)(`Hey (${MENTION}) here`, MENTION));
    node_assert_1.strict.ok(!(0, mentions_js_1.hasLiveMention)(`\`${MENTION}\``, MENTION), "inline code");
    node_assert_1.strict.ok(!(0, mentions_js_1.hasLiveMention)(`> ${MENTION}`, MENTION), "blockquote");
    node_assert_1.strict.ok(!(0, mentions_js_1.hasLiveMention)(`prefix${MENTION}suffix`, MENTION), "no boundary around mention");
});
//# sourceMappingURL=mentions.test.js.map