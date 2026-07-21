type GitHubDiscussion = {
  number: number
  title: string
  body?: string
  body_html?: string
  body_text?: string
  html_url: string
  created_at: string
  updated_at: string
  comments?: number
  category?: {
    name?: string
    slug?: string
  }
  user?: {
    login?: string
    html_url?: string
    avatar_url?: string
  }
  reactions?: {
    total_count?: number
  }
}

type ForumCache = {
  fetchedAt: number
  discussions: GitHubDiscussion[]
  exhausted: boolean
}

type ForumState = {
  discussions: GitHubDiscussion[]
  selectedNumber?: number
  fetchedAt?: number
  loading: boolean
  error?: string
  exhausted?: boolean
}

const FORUM_CACHE_VERSION = "v1"
const DEFAULT_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const DEFAULT_MAX_PAGES = 5

function escapeForumHTML(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function parseForumTitle(title: string): { title: string; author?: string } {
  const withoutPrefix = title.replace(/^guest post[_:\s-]*/i, "").trim()
  const underscoreParts = withoutPrefix
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean)

  if (underscoreParts.length >= 2) {
    return {
      author: underscoreParts[0],
      title: underscoreParts.slice(1).join(" ").trim(),
    }
  }

  return { title: withoutPrefix || title }
}

function textFromHTML(html: string): string {
  const template = document.createElement("template")
  template.innerHTML = html
  return template.content.textContent?.trim() ?? ""
}

function getBodyHeading(discussion: GitHubDiscussion): string {
  if (!discussion.body_html) return ""
  const template = document.createElement("template")
  template.innerHTML = discussion.body_html
  return template.content.querySelector("h1")?.textContent?.trim() ?? ""
}

function displayTitle(discussion: GitHubDiscussion): string {
  return getBodyHeading(discussion) || parseForumTitle(discussion.title).title
}

function displayAuthor(discussion: GitHubDiscussion): string {
  return parseForumTitle(discussion.title).author || discussion.user?.login || "GitHub user"
}

function displayDate(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value))
  } catch {
    return value.slice(0, 10)
  }
}

function getSelectedDiscussionNumber(): number | undefined {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get("discussion") ?? params.get("post")
  if (!raw) return undefined
  const number = Number.parseInt(raw, 10)
  return Number.isFinite(number) ? number : undefined
}

function setSelectedDiscussionNumber(number: number) {
  const url = new URL(window.location.href)
  url.searchParams.set("discussion", String(number))
  window.history.pushState({}, "", url)
}

function clearSelectedDiscussionNumber() {
  const url = new URL(window.location.href)
  url.searchParams.delete("discussion")
  url.searchParams.delete("post")
  window.history.pushState({}, "", url)
}

function cacheKey(repo: string, category: string): string {
  return `am-forum-discussions:${FORUM_CACHE_VERSION}:${repo}:${category}`
}

function readForumCache(repo: string, category: string): ForumCache | undefined {
  try {
    const raw = window.localStorage.getItem(cacheKey(repo, category))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as ForumCache
    if (!Array.isArray(parsed.discussions) || typeof parsed.fetchedAt !== "number") {
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

function writeForumCache(repo: string, category: string, cache: ForumCache) {
  try {
    window.localStorage.setItem(cacheKey(repo, category), JSON.stringify(cache))
  } catch {
    // Ignore quota/private-mode failures. The page still works without local cache.
  }
}

function isFresh(cache: ForumCache | undefined, ttlMs: number): boolean {
  return Boolean(cache && Date.now() - cache.fetchedAt < ttlMs)
}

function makeExcerpt(discussion: GitHubDiscussion): string {
  const title = displayTitle(discussion)
  const rawText = (discussion.body_text || textFromHTML(discussion.body_html || ""))
    .replace(title, "")
    .replace(/\s+/g, " ")
    .trim()

  if (rawText.length <= 190) return rawText
  return `${rawText.slice(0, 190).replace(/\s+\S*$/, "")}…`
}

function prepareForumBody(discussion: GitHubDiscussion): string {
  const template = document.createElement("template")
  template.innerHTML = discussion.body_html || ""

  const firstHeading = template.content.querySelector("h1")
  if (firstHeading) {
    firstHeading.remove()
  }

  template.content.querySelectorAll<HTMLAnchorElement>("a").forEach((anchor) => {
    anchor.target = "_blank"
    anchor.rel = "noopener noreferrer nofollow"
  })

  template.content.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.loading = "lazy"
    image.decoding = "async"
  })

  return template.innerHTML
}

async function fetchDiscussionPage(repo: string, page: number): Promise<GitHubDiscussion[]> {
  const url = new URL(`https://api.github.com/repos/${repo}/discussions`)
  url.searchParams.set("per_page", "100")
  url.searchParams.set("page", String(page))

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.full+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} while loading discussions.`)
  }

  const payload = await response.json()
  if (!Array.isArray(payload)) {
    throw new Error("GitHub returned an unexpected discussions response.")
  }

  return payload as GitHubDiscussion[]
}

async function fetchSingleDiscussion(repo: string, number: number): Promise<GitHubDiscussion> {
  const response = await fetch(`https://api.github.com/repos/${repo}/discussions/${number}`, {
    headers: {
      Accept: "application/vnd.github.full+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} while loading discussion #${number}.`)
  }

  return (await response.json()) as GitHubDiscussion
}

async function fetchForumDiscussions(
  repo: string,
  category: string,
  maxPages: number,
  selectedNumber?: number,
): Promise<ForumCache> {
  const allDiscussions: GitHubDiscussion[] = []
  let exhausted = false

  for (let page = 1; page <= maxPages; page++) {
    const pageItems = await fetchDiscussionPage(repo, page)
    allDiscussions.push(...pageItems)

    if (pageItems.length < 100) {
      exhausted = true
      break
    }
  }

  const normalizedCategory = category.toLowerCase()
  const discussions = allDiscussions
    .filter((discussion) => discussion.category?.slug?.toLowerCase() === normalizedCategory)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

  if (selectedNumber && !discussions.some((discussion) => discussion.number === selectedNumber)) {
    const selected = await fetchSingleDiscussion(repo, selectedNumber)
    if (selected.category?.slug?.toLowerCase() === normalizedCategory) {
      discussions.unshift(selected)
    }
  }

  return {
    fetchedAt: Date.now(),
    discussions,
    exhausted,
  }
}

function renderListActions(state: ForumState): string {
  return `
    <div class="forum-list-actions" aria-label="Forum actions">
      <a class="forum-action" href="https://github.com/orgs/augmented-mind/discussions/categories/posts" target="_blank" rel="noopener noreferrer"><span class="forum-action-icon" aria-hidden="true">↗</span><span>Posts on GitHub</span></a>
      <button class="forum-action forum-refresh-button" type="button" ${state.loading ? "disabled" : ""}><span class="forum-action-icon" aria-hidden="true">↻</span><span>${state.loading ? "Refreshing…" : "Refresh"}</span></button>
    </div>
  `
}

function renderForumIntro(): string {
  return `
    <div class="forum-list-intro">
      <p>We welcome your thoughts and perspectives on technical human-AI work. Please contribute a community post by starting a thread in the <a href="https://github.com/orgs/augmented-mind/discussions/categories/posts" target="_blank" rel="noopener noreferrer">Posts category</a> on GitHub Discussions.</p>
    </div>
  `
}

function renderCards(discussions: GitHubDiscussion[]): string {
  return `
    <div class="forum-card-grid" aria-label="Discussion posts">
      ${discussions
        .map((discussion) => {
          const title = displayTitle(discussion)
          const author = displayAuthor(discussion)
          const excerpt = makeExcerpt(discussion)
          return `
            <a class="forum-card" href="?discussion=${discussion.number}" data-discussion-number="${discussion.number}" data-router-ignore>
              <span class="forum-card-eyebrow">GitHub Discussion #${discussion.number}</span>
              <span class="forum-card-title">${escapeForumHTML(title)}</span>
              <span class="forum-card-meta">${escapeForumHTML(author)} · ${escapeForumHTML(displayDate(discussion.created_at))}</span>
              ${excerpt ? `<span class="forum-card-excerpt">${escapeForumHTML(excerpt)}</span>` : ""}
              <span class="forum-card-cta">Read post →</span>
            </a>
          `
        })
        .join("")}
    </div>
  `
}

function renderContributionBanner(discussion: GitHubDiscussion, loading: boolean): string {
  const author = displayAuthor(discussion)
  const authorUrl = discussion.user?.html_url || discussion.html_url

  return `
    <div class="forum-contribution-banner" role="note">
      <span class="forum-contribution-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 11v5"></path>
          <path d="M12 8h.01"></path>
        </svg>
      </span>
      <div class="forum-contribution-content">
        <p>This is a community post. Views are the author’s own and may not reflect the Augmented Mind hosts.</p>
        <div class="forum-contribution-actions">
          <span class="forum-action forum-meta-chip"><span class="forum-action-icon" aria-hidden="true">#</span><span>Discussion ${discussion.number}</span></span>
          <a class="forum-action forum-meta-chip" href="${escapeForumHTML(authorUrl)}" target="_blank" rel="noopener noreferrer nofollow"><span class="forum-action-icon" aria-hidden="true">@</span><span>${escapeForumHTML(author)}</span></a>
          <span class="forum-action-separator" aria-hidden="true">|</span>
          <a class="forum-action forum-back-link" href="${escapeForumHTML(window.location.pathname)}" data-router-ignore><span class="forum-action-icon" aria-hidden="true">←</span><span>All posts</span></a>
          <a class="forum-action" href="${escapeForumHTML(discussion.html_url)}" target="_blank" rel="noopener noreferrer nofollow"><span class="forum-action-icon" aria-hidden="true">↗</span><span>GitHub</span></a>
          <button class="forum-action forum-refresh-button" type="button" ${loading ? "disabled" : ""}><span class="forum-action-icon" aria-hidden="true">↻</span><span>${loading ? "Refreshing…" : "Refresh"}</span></button>
        </div>
      </div>
    </div>
  `
}

function renderSelectedDiscussion(discussion: GitHubDiscussion, state: ForumState): string {
  const title = displayTitle(discussion)
  const body = prepareForumBody(discussion)

  return `
    <article class="forum-post" aria-live="polite">
      <div class="forum-inline-header popover-hint">
        <span class="forum-post-id">POST</span>
        <span class="meta-sep" aria-hidden="true">·</span>
        <span class="forum-inline-title">${escapeForumHTML(title)}</span>
        <span class="meta-sep" aria-hidden="true">·</span>
        <time datetime="${escapeForumHTML(discussion.created_at)}">${escapeForumHTML(displayDate(discussion.created_at))}</time>
      </div>
      ${renderContributionBanner(discussion, state.loading)}
      <div class="forum-post-body markdown-body">
        ${body}
      </div>
    </article>
  `
}

function bindForumEvents(root: HTMLElement, state: ForumState) {
  root.querySelectorAll<HTMLAnchorElement>(".forum-card").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault()
      const number = Number.parseInt(link.dataset.discussionNumber || "", 10)
      if (!Number.isFinite(number)) return
      setSelectedDiscussionNumber(number)
      renderForum(root, { ...state, selectedNumber: number })
      root.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  })

  root.querySelector<HTMLAnchorElement>(".forum-back-link")?.addEventListener("click", (event) => {
    event.preventDefault()
    clearSelectedDiscussionNumber()
    renderForum(root, { ...state, selectedNumber: undefined })
    root.scrollIntoView({ behavior: "smooth", block: "start" })
  })

  root.querySelector<HTMLButtonElement>(".forum-refresh-button")?.addEventListener("click", () => {
    refreshForum(root, state)
  })
}

function renderForum(root: HTMLElement, state: ForumState) {
  const selected = state.selectedNumber
    ? state.discussions.find((discussion) => discussion.number === state.selectedNumber)
    : undefined

  document.body.classList.toggle("forum-detail-view", Boolean(state.selectedNumber))

  if (state.loading && state.discussions.length === 0) {
    root.innerHTML = `
      <div class="forum-loading" role="status">
        <span class="forum-spinner" aria-hidden="true"></span>
        Loading posts from GitHub Discussions…
      </div>
    `
    return
  }

  if (state.error && state.discussions.length === 0) {
    root.innerHTML = `
      <div class="forum-error" role="alert">
        <strong>Unable to load forum posts.</strong>
        <p>${escapeForumHTML(state.error)}</p>
        <p><a href="https://github.com/orgs/augmented-mind/discussions/categories/posts" target="_blank" rel="noopener noreferrer">Open the Posts category on GitHub →</a></p>
      </div>
    `
    return
  }

  if (state.discussions.length === 0) {
    root.innerHTML = `
      <div class="forum-empty">
        No Posts-category discussions were found yet.
        <a href="https://github.com/orgs/augmented-mind/discussions/categories/posts" target="_blank" rel="noopener noreferrer">Start one on GitHub →</a>
      </div>
    `
    return
  }

  const truncationNote =
    state.exhausted === false
      ? `<p class="forum-note">Showing Posts found in the first configured GitHub Discussions pages. Use the GitHub category link if something is missing.</p>`
      : ""
  const warning = state.error
    ? `<div class="forum-warning" role="status">${escapeForumHTML(state.error)}</div>`
    : ""

  if (state.selectedNumber) {
    const content = selected
      ? renderSelectedDiscussion(selected, state)
      : state.loading
        ? `<div class="forum-loading" role="status"><span class="forum-spinner" aria-hidden="true"></span>Loading discussion #${state.selectedNumber}…</div>`
        : `<div class="forum-error" role="alert">Discussion #${state.selectedNumber} was not found in the Posts category.</div>`

    root.innerHTML = `
      ${warning}
      ${content}
    `
    bindForumEvents(root, state)
    return
  }

  root.innerHTML = `
    ${renderForumIntro()}
    ${renderListActions(state)}
    ${truncationNote}
    ${warning}
    ${renderCards(state.discussions)}
  `
  bindForumEvents(root, state)
}

function refreshForum(root: HTMLElement, state: ForumState) {
  const repo = root.dataset.repo || "augmented-mind/augmented-mind.github.io"
  const category = root.dataset.category || "posts"
  const maxPages = Number.parseInt(root.dataset.maxPages || "", 10) || DEFAULT_MAX_PAGES

  renderForum(root, { ...state, loading: true, error: undefined })
  fetchForumDiscussions(repo, category, maxPages, state.selectedNumber)
    .then((freshCache) => {
      writeForumCache(repo, category, freshCache)
      renderForum(root, {
        discussions: freshCache.discussions,
        selectedNumber: state.selectedNumber,
        fetchedAt: freshCache.fetchedAt,
        exhausted: freshCache.exhausted,
        loading: false,
      })
    })
    .catch((error) => {
      renderForum(root, {
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      })
    })
}

function initForumDiscussions() {
  const root = document.querySelector<HTMLElement>("#forum-discussions")
  if (!root) {
    document.body.classList.remove("forum-detail-view")
    return
  }
  if (root.dataset.forumMounted === "true") return
  root.dataset.forumMounted = "true"

  const repo = root.dataset.repo || "augmented-mind/augmented-mind.github.io"
  const category = root.dataset.category || "posts"
  const ttlMs = Number.parseInt(root.dataset.cacheTtl || "", 10) || DEFAULT_CACHE_TTL_MS
  const maxPages = Number.parseInt(root.dataset.maxPages || "", 10) || DEFAULT_MAX_PAGES
  const selectedNumber = getSelectedDiscussionNumber()
  const cached = readForumCache(repo, category)
  const selectedMissing = Boolean(
    selectedNumber &&
    !cached?.discussions.some((discussion) => discussion.number === selectedNumber),
  )
  const shouldFetch = !isFresh(cached, ttlMs) || selectedMissing

  const baseState: ForumState = {
    discussions: cached?.discussions ?? [],
    selectedNumber,
    fetchedAt: cached?.fetchedAt,
    loading: shouldFetch,
    exhausted: cached?.exhausted,
  }

  renderForum(root, baseState)

  if (!shouldFetch) return

  fetchForumDiscussions(repo, category, maxPages, selectedNumber)
    .then((freshCache) => {
      writeForumCache(repo, category, freshCache)
      renderForum(root, {
        discussions: freshCache.discussions,
        selectedNumber,
        fetchedAt: freshCache.fetchedAt,
        exhausted: freshCache.exhausted,
        loading: false,
      })
    })
    .catch((error) => {
      renderForum(root, {
        ...baseState,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      })
    })
}

document.addEventListener("nav", initForumDiscussions)
initForumDiscussions()
