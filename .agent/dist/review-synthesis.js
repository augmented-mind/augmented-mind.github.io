"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVIEW_SYNTHESIS_MARKER = exports.REVIEW_SYNTHESIS_HEADING = void 0;
exports.buildReviewSynthesisMarker = buildReviewSynthesisMarker;
exports.isReviewSynthesisBody = isReviewSynthesisBody;
exports.REVIEW_SYNTHESIS_HEADING = "## AI Review Synthesis";
exports.REVIEW_SYNTHESIS_MARKER = "<!-- sepo-agent-review-synthesis -->";
function buildReviewSynthesisMarker() {
    return exports.REVIEW_SYNTHESIS_MARKER;
}
function isReviewSynthesisBody(body) {
    return body.includes(exports.REVIEW_SYNTHESIS_MARKER)
        || body.trimStart().startsWith(exports.REVIEW_SYNTHESIS_HEADING);
}
//# sourceMappingURL=review-synthesis.js.map