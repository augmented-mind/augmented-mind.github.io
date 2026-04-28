"use strict";
// Discussion-specific GraphQL operations needed by the portal.
//
// Uses gh api graphql for all calls, consistent with the self-serve pattern.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDiscussionReplyTo = resolveDiscussionReplyTo;
exports.fetchDiscussionComments = fetchDiscussionComments;
exports.updateDiscussionComment = updateDiscussionComment;
exports.fetchRepositoryDiscussionConfig = fetchRepositoryDiscussionConfig;
exports.requireDiscussionCategory = requireDiscussionCategory;
exports.createDiscussion = createDiscussion;
exports.createRepositoryDiscussion = createRepositoryDiscussion;
const github_graphql_js_1 = require("./github-graphql.js");
/**
 * Resolves the reply-to target for a discussion comment.
 * Returns the parent comment node ID if the comment is a nested reply,
 * or the comment's own ID if it's a top-level reply.
 */
function resolveDiscussionReplyTo(commentNodeId) {
    const query = `
    query($nodeId: ID!) {
      node(id: $nodeId) {
        ... on DiscussionComment {
          replyTo { id }
        }
      }
    }
  `;
    const data = (0, github_graphql_js_1.ghGraphqlData)(query, { nodeId: commentNodeId });
    // If the comment has a replyTo, it's a nested reply — use the parent.
    // Otherwise return the comment itself as the reply target.
    return data.node?.replyTo?.id || commentNodeId;
}
/**
 * Fetches all comments for a discussion with cursor-based pagination.
 * Returns flattened list suitable for findLatestPendingRequest scanning.
 */
function fetchDiscussionComments(owner, repo, number) {
    const query = `
    query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        discussion(number: $number) {
          comments(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              body
              createdAt
            }
          }
        }
      }
    }
  `;
    const allComments = [];
    let cursor = "";
    let hasNextPage = true;
    while (hasNextPage) {
        const vars = {
            owner,
            repo,
            number,
        };
        if (cursor) {
            vars.cursor = cursor;
        }
        const data = (0, github_graphql_js_1.ghGraphqlData)(query, vars);
        const comments = data.repository?.discussion?.comments;
        const nodes = comments?.nodes || [];
        for (const n of nodes) {
            allComments.push({
                id: n.id,
                body: n.body || "",
                created_at: n.createdAt || "",
            });
        }
        hasNextPage = comments?.pageInfo?.hasNextPage ?? false;
        cursor = comments?.pageInfo?.endCursor || "";
    }
    return allComments;
}
/**
 * Updates an existing discussion comment body.
 */
function updateDiscussionComment(commentId, body) {
    const query = `
    mutation($commentId: ID!, $body: String!) {
      updateDiscussionComment(input: { commentId: $commentId, body: $body }) {
        comment { id }
      }
    }
  `;
    (0, github_graphql_js_1.ghGraphqlData)(query, { commentId, body });
}
/**
 * Fetches repository discussion settings and all visible discussion categories.
 */
function fetchRepositoryDiscussionConfig(client, owner, repo) {
    const query = `
    query($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        id
        hasDiscussionsEnabled
        discussionCategories(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes { id name }
        }
      }
    }
  `;
    const categories = [];
    let repositoryId = "";
    let hasDiscussionsEnabled = false;
    let cursor = "";
    let hasNextPage = true;
    while (hasNextPage) {
        const variables = { owner, repo };
        if (cursor)
            variables.cursor = cursor;
        const data = client.graphql(query, variables);
        const repository = data.repository;
        if (!repository?.id) {
            throw new Error(`Repository not found: ${owner}/${repo}`);
        }
        repositoryId = repository.id;
        hasDiscussionsEnabled = repository.hasDiscussionsEnabled ?? false;
        const page = repository.discussionCategories;
        for (const category of page?.nodes || []) {
            if (category?.id && category.name) {
                categories.push({ id: category.id, name: category.name });
            }
        }
        hasNextPage = page?.pageInfo?.hasNextPage ?? false;
        cursor = page?.pageInfo?.endCursor || "";
    }
    return { repositoryId, hasDiscussionsEnabled, categories };
}
function requireDiscussionCategory(config, categoryName) {
    if (!config.hasDiscussionsEnabled) {
        throw new Error("Repository discussions are not enabled; cannot create a discussion.");
    }
    const category = config.categories.find((candidate) => candidate.name === categoryName);
    if (!category) {
        throw new Error(`Required discussion category '${categoryName}' was not found.`);
    }
    return category;
}
function createDiscussion(client, repoId, categoryId, title, body) {
    const query = `
    mutation($repoId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {
        repositoryId: $repoId,
        categoryId: $categoryId,
        title: $title,
        body: $body
      }) {
        discussion { url }
      }
    }
  `;
    const data = client.graphql(query, { repoId, categoryId, title, body });
    const url = data.createDiscussion?.discussion?.url;
    if (!url) {
        throw new Error("GitHub did not return a URL for the created discussion.");
    }
    return { url };
}
function createRepositoryDiscussion(owner, repo, categoryName, title, body, client = (0, github_graphql_js_1.createGhGraphqlClient)()) {
    const config = fetchRepositoryDiscussionConfig(client, owner, repo);
    const category = requireDiscussionCategory(config, categoryName);
    return createDiscussion(client, config.repositoryId, category.id, title, body);
}
//# sourceMappingURL=discussion.js.map