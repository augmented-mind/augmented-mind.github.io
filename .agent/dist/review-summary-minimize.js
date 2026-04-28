"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collapsePreviousReviewSummaries = collapsePreviousReviewSummaries;
const github_graphql_js_1 = require("./github-graphql.js");
const review_synthesis_js_1 = require("./review-synthesis.js");
const VIEWER_QUERY = `
  query ViewerLogin {
    viewer {
      login
    }
  }
`;
const COMMENTS_QUERY = `
  query PullRequestReviewSummaryComments(
    $owner: String!
    $name: String!
    $number: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        comments(first: 100, after: $after) {
          nodes {
            id
            body
            isMinimized
            author {
              login
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;
const REVIEWS_QUERY = `
  query PullRequestReviewSummaries(
    $owner: String!
    $name: String!
    $number: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviews(first: 100, after: $after) {
          nodes {
            id
            body
            isMinimized
            author {
              login
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;
const MINIMIZE_COMMENT_MUTATION = `
  mutation MinimizeReviewSummary($id: ID!, $classifier: ReportedContentClassifiers!) {
    minimizeComment(input: { subjectId: $id, classifier: $classifier }) {
      minimizedComment {
        isMinimized
      }
    }
  }
`;
function parseRepo(repo) {
    const [owner, name] = repo.split("/", 2);
    if (!owner || !name) {
        throw new Error(`Expected GITHUB_REPOSITORY-style repo slug, got ${JSON.stringify(repo)}`);
    }
    return { owner, name };
}
function normalizeActorLogin(login) {
    return String(login || "").trim().replace(/\[bot\]$/i, "");
}
function isSameActorLogin(left, right) {
    return normalizeActorLogin(left) === normalizeActorLogin(right);
}
function isGeneratedReviewSummary(node, viewerLogin) {
    if (!node.id || node.isMinimized)
        return false;
    if (!isSameActorLogin(node.author?.login || "", viewerLogin))
        return false;
    return (0, review_synthesis_js_1.isReviewSynthesisBody)(node.body || "");
}
function fetchViewerLogin(client) {
    const data = client.graphql(VIEWER_QUERY, {});
    const login = data.viewer?.login || "";
    if (!login) {
        throw new Error("Could not resolve authenticated GitHub viewer login");
    }
    return login;
}
function fetchMatchingNodes(client, query, connectionName, repo, prNumber, viewerLogin) {
    const matches = [];
    let after;
    do {
        const data = client.graphql(query, {
            owner: repo.owner,
            name: repo.name,
            number: prNumber,
            after,
        });
        const pullRequest = data.repository?.pullRequest;
        const connection = connectionName === "comments"
            ? pullRequest?.comments
            : pullRequest?.reviews;
        if (!connection)
            return matches;
        for (const node of connection.nodes || []) {
            if (isGeneratedReviewSummary(node, viewerLogin)) {
                matches.push(node);
            }
        }
        after = connection.pageInfo.hasNextPage
            ? connection.pageInfo.endCursor || undefined
            : undefined;
    } while (after);
    return matches;
}
/**
 * Collapses older agent-generated PR review summaries before posting a fresh one.
 */
function collapsePreviousReviewSummaries(options) {
    const client = options.client || (0, github_graphql_js_1.createGhGraphqlClient)();
    const repo = parseRepo(options.repo);
    const viewerLogin = fetchViewerLogin(client);
    const nodes = [
        ...fetchMatchingNodes(client, COMMENTS_QUERY, "comments", repo, options.prNumber, viewerLogin),
        ...fetchMatchingNodes(client, REVIEWS_QUERY, "reviews", repo, options.prNumber, viewerLogin),
    ];
    const uniqueNodeIds = Array.from(new Set(nodes.map((node) => node.id).filter(Boolean)));
    for (const id of uniqueNodeIds) {
        client.graphql(MINIMIZE_COMMENT_MUTATION, {
            id,
            classifier: "OUTDATED",
        });
    }
    return uniqueNodeIds.length;
}
//# sourceMappingURL=review-summary-minimize.js.map