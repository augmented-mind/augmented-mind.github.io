import { ComponentChildren } from "preact"
import { Element, Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { Date, getDate } from "../Date"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

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
  const episodeId = (fileData.frontmatter?.episodeId ?? fileData.frontmatter?.streamId) as string | undefined
  const author = fileData.frontmatter?.author as string | undefined
  const authorUrl = fileData.frontmatter?.authorUrl as string | undefined
  const isSeriesPage =
    (fileData.slug?.startsWith("episodes/") && fileData.slug !== "episodes/index") ||
    (fileData.slug?.startsWith("livestreams/") && fileData.slug !== "livestreams/index")
  const isGuestPost =
    (fileData.slug?.startsWith("guest-posts/") && fileData.slug !== "guest-posts/index") ?? false
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
      {isGuestPost && (
        <div class="guest-post-header popover-hint">
          <div class="guest-post-meta">
            <span class="guest-post-badge">Guest Post</span>
            {pageDate && <span class="meta-sep">·</span>}
            {pageDate && <Date date={pageDate} locale={cfg.locale} />}
          </div>
          <h1 class="guest-post-title">{title}</h1>
          {author && (
            <div class="guest-post-byline">
              <span class="guest-post-byline-label">by</span>{" "}
              {authorUrl ? (
                <a href={authorUrl} target="_blank" rel="noopener noreferrer">
                  {author}
                </a>
              ) : (
                <span class="guest-post-author">{author}</span>
              )}
            </div>
          )}
        </div>
      )}
      <article class={classString}>{content}</article>
    </>
  )
}

Content.css = `
body[data-slug^="episodes/"] .page-header,
body[data-slug^="livestreams/"] .page-header,
body[data-slug^="guest-posts/"] .page-header {
  display: none;
}

body[data-slug^="episodes/"] .page > #quartz-body .center,
body[data-slug^="livestreams/"] .page > #quartz-body .center,
body[data-slug^="guest-posts/"] .page > #quartz-body .center {
  padding-top: calc(2rem + 16px);
  overflow: hidden;
}

@media all and (max-width: 800px) {
  body[data-slug^="episodes/"] .page > #quartz-body .center,
  body[data-slug^="livestreams/"] .page > #quartz-body .center,
  body[data-slug^="guest-posts/"] .page > #quartz-body .center {
    padding-top: calc(1.5rem + 16px);
  }
}

.guest-post-header {
  margin: calc(-2rem + 16px) -2rem 1.75rem;
  padding: 1.1rem 2rem 1.4rem;
  background: var(--episode-card-header-bg, var(--lightgray));
  border-bottom: 1px solid var(--lightgray);
  border-radius: 16px 16px 0 0;
}

.guest-post-header .guest-post-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--gray);
  font-size: 0.85rem;
}

.guest-post-header .guest-post-badge {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  color: var(--secondary);
  border: 1px solid var(--secondary);
  border-radius: 4px;
}

.guest-post-header .guest-post-title {
  margin: 0.7rem 0 0.5rem;
  font-size: 1.85rem;
  line-height: 1.2;
}

.guest-post-header .guest-post-byline {
  color: var(--gray);
  font-size: 0.95rem;
}

.guest-post-header .guest-post-byline-label {
  opacity: 0.8;
}

.guest-post-header .guest-post-byline a,
.guest-post-header .guest-post-author {
  color: var(--secondary);
  font-weight: 600;
}

@media all and (max-width: 800px) {
  .guest-post-header {
    margin: calc(-1.5rem + 16px) -1.5rem 1.5rem;
    padding: 0.9rem 1.5rem 1.2rem;
    border-radius: 12px 12px 0 0;
  }

  .guest-post-header .guest-post-title {
    font-size: 1.5rem;
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
`

export default (() => Content) satisfies QuartzComponentConstructor
