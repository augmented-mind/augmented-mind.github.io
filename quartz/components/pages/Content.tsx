import { ComponentChildren } from "preact"
import { Element, Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
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

function createYouTubeEmbed(title: string, embedUrl: string): Element {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["youtube-embed-inline"] },
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

function injectYouTubeEmbed(root: Root, title: string, youtubeUrl: string) {
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

const Content: QuartzComponent = ({ fileData, tree }: QuartzComponentProps) => {
  const root = tree as Root
  const title = (fileData.frontmatter?.title as string | undefined) ?? "YouTube video"
  const youtubeUrl = fileData.frontmatter?.youtubeUrl as string | undefined

  if (youtubeUrl) {
    injectYouTubeEmbed(root, title, youtubeUrl)
  }

  const content = htmlToJsx(fileData.filePath!, root) as ComponentChildren
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  return <article class={classString}>{content}</article>
}

Content.css = `
.youtube-embed-inline {
  margin: 1.5rem 0 1.5rem 0;
  padding-top: 1.25rem;
  border-top: 1px solid var(--lightgray);
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
