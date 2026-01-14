import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, SimpleSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { byDateAndAlphabetical } from "./PageList"
import style from "./styles/episodeCarousel.scss"
import { Date, getDate } from "./Date"
import { GlobalConfiguration } from "../cfg"
import { classNames } from "../util/lang"

interface Options {
  title?: string
  limit: number
  linkToMore: SimpleSlug | false
  showTags: boolean
  filter: (f: QuartzPluginData) => boolean
  sort: (f1: QuartzPluginData, f2: QuartzPluginData) => number
}

const defaultOptions = (cfg: GlobalConfiguration): Options => ({
  limit: 10,
  linkToMore: false,
  showTags: true,
  filter: () => true,
  sort: byDateAndAlphabetical(cfg),
})

// Default placeholder image for episodes without cover
const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect fill='%23f5f0e8' width='400' height='225'/%3E%3Ctext x='200' y='112' font-family='system-ui' font-size='48' fill='%23e07b39' text-anchor='middle' dominant-baseline='middle'%3E🎙️%3C/text%3E%3C/svg%3E"

export default ((userOpts?: Partial<Options>) => {
  const EpisodeCarousel: QuartzComponent = ({
    allFiles,
    fileData,
    displayClass,
    cfg,
  }: QuartzComponentProps) => {
    const opts = { ...defaultOptions(cfg), ...userOpts }
    const pages = allFiles.filter(opts.filter).sort(opts.sort)
    const remaining = Math.max(0, pages.length - opts.limit)

    return (
      <div class={classNames(displayClass, "episode-carousel")}>
        {opts.title && <h3 class="carousel-title">{opts.title}</h3>}
        <div class="carousel-container">
          <div class="carousel-track">
            {pages.slice(0, opts.limit).map((page) => {
              const title = page.frontmatter?.title ?? "Untitled"
              const tags = page.frontmatter?.tags ?? []
              const episodeId = page.frontmatter?.episodeId as string | undefined
              const coverImage = (page.frontmatter?.coverImage as string) || DEFAULT_COVER
              const youtubeUrl = page.frontmatter?.youtubeUrl as string | undefined

              // Use YouTube URL if available, otherwise link to internal page
              const linkUrl = youtubeUrl || resolveRelative(fileData.slug!, page.slug!)
              const isExternal = !!youtubeUrl

              return (
                <a
                  href={linkUrl}
                  class="episode-card"
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                >
                  <div class="card-image">
                    <img
                      src={coverImage}
                      alt={`Cover for ${title}`}
                      loading="lazy"
                      style={{ marginTop: "0" }}
                    />
                    {isExternal && (
                      <div class="play-overlay">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div class="card-content">
                    <div class="card-meta">
                      {episodeId && <span class="episode-id">{episodeId}</span>}
                      {page.dates && (
                        <span class="episode-date">
                          <Date date={getDate(cfg, page)!} locale={cfg.locale} />
                        </span>
                      )}
                    </div>
                    <h4 class="card-title">{title}</h4>
                    {opts.showTags && tags.length > 0 && (
                      <ul class="card-tags">
                        {tags.slice(0, 2).map((tag) => (
                          <li>
                            <span class="tag">{tag}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        </div>
        {opts.linkToMore && remaining > 0 && (
          <p class="see-more">
            <a href={resolveRelative(fileData.slug!, opts.linkToMore)}>
              See {remaining} more episode{remaining > 1 ? "s" : ""} →
            </a>
          </p>
        )}
      </div>
    )
  }

  EpisodeCarousel.css = style
  return EpisodeCarousel
}) satisfies QuartzComponentConstructor
