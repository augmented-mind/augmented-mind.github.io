import { hasLiveMention } from "./mentions.js";
export declare const DEFAULT_TRUSTED_ASSOCIATIONS: Set<string>;
export declare const DEFAULT_MENTION = "@sepo-agent";
export interface PortalEventContext {
    body: string;
    sourceKind: string;
    targetKind: string;
    targetNumber: string;
    targetUrl: string;
    reactionSubjectId: string;
    responseKind: string;
    sourceCommentId?: string;
    sourceCommentUrl?: string;
    reviewCommentId?: string;
    discussionNodeId?: string;
    discussionCommentNodeId?: string;
}
type Payload = Record<string, any>;
/**
 * Returns the author association field for the current trigger shape.
 */
export declare function getAuthorAssociation(eventName: string, payload: Payload): string;
/**
 * Extracts the requesting user's login from the event payload.
 */
export declare function getRequestedBy(eventName: string, payload: Payload): string;
/**
 * Extracts a normalized portal event context from a supported webhook payload.
 */
export declare function extractEventContext(eventName: string, payload: Payload): PortalEventContext;
/**
 * Filters out bot-authored events before the portal spends effort on them.
 */
export declare function shouldSkipSender(payload: Payload): boolean;
/**
 * Checks whether this payload should trigger a mention-based response.
 * Edited events only trigger when the live mention state changes false -> true.
 */
export declare function shouldRespondToMention(eventName: string, payload: Payload, mention: string): boolean;
export { hasLiveMention };
//# sourceMappingURL=context.d.ts.map