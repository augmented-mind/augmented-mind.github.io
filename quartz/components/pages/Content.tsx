import { ComponentChildren } from "preact"
import { Element, Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { Date, getDate } from "../Date"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
// @ts-ignore
import forumScript from "../scripts/forum.inline"

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    let videoId: string | null = null

    if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1)
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(parsed.hostname)) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v")
      } else if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] ?? null
      }
    }

    if (!videoId) {
      return null
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`
  } catch {
    return null
  }
}

function hasClass(el: Element, className: string): boolean {
  const classes = el.properties?.className
  if (Array.isArray(classes)) {
    return classes.includes(className)
  }

  return classes === className
}

function createYouTubeEmbed(title: string, embedUrl: string, topOfArticle = false): Element {
  return {
    type: "element",
    tagName: "div",
    properties: {
      className: ["youtube-embed-inline", ...(topOfArticle ? ["top-of-article"] : [])],
    },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { className: ["youtube-embed-frame"] },
        children: [
          {
            type: "element",
            tagName: "iframe",
            properties: {
              src: embedUrl,
              title,
              loading: "lazy",
              allow:
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
              referrerPolicy: "strict-origin-when-cross-origin",
              allowFullScreen: true,
            },
            children: [],
          },
        ],
      },
    ],
  }
}

function injectYouTubeEmbed(root: Root, title: string, youtubeUrl: string, topOfArticle = false) {
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl)
  if (!embedUrl) {
    return
  }

  const alreadyInjected = root.children.some(
    (child) =>
      child.type === "element" &&
      child.tagName === "div" &&
      hasClass(child, "youtube-embed-inline"),
  )
  if (alreadyInjected) {
    return
  }

  if (topOfArticle) {
    root.children.splice(0, 0, createYouTubeEmbed(title, embedUrl, true))
    return
  }

  let paragraphCount = 0
  let insertIndex: number | null = null

  for (const [i, child] of root.children.entries()) {
    if (child.type === "element" && child.tagName === "p") {
      paragraphCount += 1
      insertIndex = i + 1
      if (paragraphCount === 2) {
        break
      }
    }
  }

  root.children.splice(insertIndex ?? 0, 0, createYouTubeEmbed(title, embedUrl))
}

const Content: QuartzComponent = ({ fileData, tree, cfg }: QuartzComponentProps) => {
  const root = tree as Root
  const title = (fileData.frontmatter?.title as string | undefined) ?? "YouTube video"
  const youtubeUrl = fileData.frontmatter?.youtubeUrl as string | undefined
  const episodeId = (fileData.frontmatter?.episodeId ?? fileData.frontmatter?.streamId) as
    | string
    | undefined
  const isSeriesPage =
    (fileData.slug?.startsWith("episodes/") && fileData.slug !== "episodes/index") ||
    (fileData.slug?.startsWith("livestreams/") && fileData.slug !== "livestreams/index")
  const pageDate = getDate(cfg, fileData)

  if (youtubeUrl) {
    injectYouTubeEmbed(root, title, youtubeUrl, isSeriesPage)
  }

  const content = htmlToJsx(fileData.filePath!, root) as ComponentChildren
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")

  return (
    <>
      {isSeriesPage && (
        <div class="episode-inline-header popover-hint">
          {episodeId && <span class="episode-id">{episodeId}</span>}
          {episodeId && <span class="meta-sep">·</span>}
          <span class="episode-inline-title">{title}</span>
          {pageDate && <span class="meta-sep">·</span>}
          {pageDate && <Date date={pageDate} locale={cfg.locale} />}
        </div>
      )}
      <article class={classString}>{content}</article>
    </>
  )
}

Content.css = `
body[data-slug^="episodes/"] .page-header,
body[data-slug^="livestreams/"] .page-header {
  display: none;
}

body[data-slug^="episodes/"] .page > #quartz-body .center,
body[data-slug^="livestreams/"] .page > #quartz-body .center {
  padding-top: calc(2rem + 16px);
  overflow: hidden;
}

@media all and (max-width: 800px) {
  body[data-slug^="episodes/"] .page > #quartz-body .center,
  body[data-slug^="livestreams/"] .page > #quartz-body .center {
    padding-top: calc(1.5rem + 16px);
  }
}

.episode-inline-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: calc(-2rem + 16px) -2rem 1.25rem;
  padding: 1rem 2rem 0.9rem;
  min-width: 0;
  color: var(--gray);
  font-size: 0.85rem;
  white-space: nowrap;
  background: var(--episode-card-header-bg, var(--lightgray));
  border-bottom: 1px solid var(--lightgray);
  border-radius: 16px 16px 0 0;
}

@media all and (max-width: 800px) {
  .episode-inline-header {
    margin: calc(-1.5rem + 16px) -1.5rem 1rem;
    padding: 0.9rem 1.5rem 0.8rem;
    border-radius: 12px 12px 0 0;
  }
}

.episode-inline-header .episode-id {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--gray);
  border-radius: 4px;
  flex-shrink: 0;
}

.episode-inline-header .meta-sep {
  opacity: 0.6;
  flex-shrink: 0;
}

.episode-inline-header time {
  flex-shrink: 0;
}

.episode-inline-header .episode-inline-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--secondary);
  font-weight: 600;
}

.youtube-embed-inline {
  margin: 1.5rem 0 1.5rem 0;
  padding-top: 1.25rem;
  border-top: 1px solid var(--lightgray);
}

.youtube-embed-inline.top-of-article {
  margin: 0 0 1.5rem 0;
  padding-top: 0.5rem;
  border-top: none;
}

.youtube-embed-frame {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--lightgray);
  background: var(--lightgray);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 2px 8px rgba(0, 0, 0, 0.02);
}

.youtube-embed-frame iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.forum-discussions {
  margin-top: 2rem;
}

body.forum-detail-view[data-slug="forum"] .page-header {
  display: none;
}

body.forum-detail-view[data-slug="forum"] .forum-discussions {
  margin-top: 0;
}

.forum-refresh-button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.forum-list-intro {
  margin-bottom: 1.25rem;
  color: var(--darkgray);
}

.forum-list-intro p {
  margin: 0;
}

.forum-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 1rem;
}

.forum-card,
.forum-loading,
.forum-error,
.forum-empty,
.forum-warning,
.forum-note {
  border: 1px solid var(--lightgray);
  border-radius: 14px;
  background: color-mix(in srgb, var(--light) 94%, var(--lightgray));
}

.forum-card {
  display: flex;
  flex-direction: column;
  padding: 1.1rem;
  color: var(--darkgray);
  text-decoration: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.forum-card:hover {
  border-color: color-mix(in srgb, var(--secondary) 45%, transparent);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.forum-card-eyebrow {
  color: var(--secondary);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.forum-card-title {
  margin-top: 0.55rem;
  color: var(--dark);
  font-size: 1.12rem;
  font-weight: 700;
  line-height: 1.25;
}

.forum-card-meta {
  margin-top: 0.45rem;
  color: var(--gray);
  font-size: 0.85rem;
}

.forum-card-excerpt {
  margin-top: 0.75rem;
  color: var(--darkgray);
  font-size: 0.92rem;
  line-height: 1.45;
}

.forum-card-cta {
  margin-top: 0.85rem;
  color: var(--secondary);
  font-weight: 700;
}

.forum-post {
  min-width: 0;
}

.forum-contribution-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding: 0.9rem 1rem;
  color: var(--darkgray);
  font-size: 0.9rem;
  line-height: 1.45;
  background: color-mix(in srgb, var(--lightgray) 58%, var(--light));
  border: 1px solid var(--lightgray);
  border-radius: 12px;
}

.forum-contribution-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  margin-top: 0.05rem;
  color: var(--gray);
  background: color-mix(in srgb, var(--light) 70%, var(--lightgray));
  border: 1px solid color-mix(in srgb, var(--gray) 40%, transparent);
  border-radius: 999px;
}

.forum-contribution-icon svg {
  width: 0.95rem;
  height: 0.95rem;
}

.forum-contribution-content {
  flex: 1 1 auto;
  min-width: 0;
}

.forum-contribution-content p {
  margin: 0;
}

.forum-contribution-banner strong {
  color: var(--dark);
}

.forum-contribution-banner a {
  font-weight: 600;
}

.forum-list-actions,
.forum-contribution-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.forum-list-actions {
  margin: -0.45rem 0 1.25rem;
}

.forum-contribution-actions {
  margin-top: 0.6rem;
}

.forum-action {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.2rem 0.5rem;
  color: var(--darkgray);
  font: inherit;
  font-size: 0.82rem;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  background: color-mix(in srgb, var(--light) 78%, var(--lightgray));
  border: 1px solid var(--lightgray);
  border-radius: 999px;
  cursor: pointer;
}

.forum-action:hover {
  color: var(--secondary);
  border-color: color-mix(in srgb, var(--secondary) 35%, var(--lightgray));
}

.forum-action-separator {
  color: var(--gray);
  opacity: 0.75;
}

.forum-refresh-button {
  margin: 0;
}

.forum-action-icon {
  color: var(--secondary);
  line-height: 1;
}

.forum-inline-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: calc(-2rem + 16px) -2rem 1.25rem;
  padding: 1rem 2rem 0.9rem;
  min-width: 0;
  color: var(--gray);
  font-size: 0.85rem;
  line-height: 1.35;
  white-space: nowrap;
  background: var(--episode-card-header-bg, var(--light));
  border-bottom: 1px solid var(--lightgray);
  border-radius: 16px 16px 0 0;
}

.forum-inline-header .forum-post-id {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  color: var(--gray);
  border: 1px solid var(--gray);
  border-radius: 4px;
}

.forum-inline-header .meta-sep,
.forum-inline-header time {
  flex-shrink: 0;
}

.forum-inline-header .meta-sep {
  opacity: 0.6;
}

.forum-inline-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--secondary);
  font-size: 1rem;
  font-weight: 700;
}

.forum-post-body > :first-child {
  margin-top: 0;
}

.forum-post-body img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.25rem auto;
  border-radius: 12px;
}

.forum-post-body blockquote {
  margin-left: 0;
}

.forum-loading,
.forum-error,
.forum-empty,
.forum-warning,
.forum-note {
  padding: 1rem;
}

.forum-warning,
.forum-note {
  margin-bottom: 1rem;
  color: var(--gray);
  font-size: 0.9rem;
}

.forum-spinner {
  display: inline-block;
  width: 0.9rem;
  height: 0.9rem;
  margin-right: 0.45rem;
  border: 2px solid var(--lightgray);
  border-top-color: var(--secondary);
  border-radius: 50%;
  animation: forum-spin 0.8s linear infinite;
  vertical-align: -0.1rem;
}

@keyframes forum-spin {
  to {
    transform: rotate(360deg);
  }
}

@media all and (max-width: 600px) {
  .forum-inline-header {
    margin: calc(-1.5rem + 12px) -1.5rem 1.25rem;
    padding: 0.9rem 1.5rem;
    overflow: hidden;
    border-radius: 12px 12px 0 0;
  }

  .forum-contribution-banner {
    padding: 0.8rem 0.9rem;
  }

  .forum-contribution-actions {
    justify-content: flex-start;
  }
}
`

Content.afterDOMLoaded = forumScript

export default (() => Content) satisfies QuartzComponentConstructor
