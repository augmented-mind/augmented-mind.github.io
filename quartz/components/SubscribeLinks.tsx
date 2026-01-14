import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

interface SubscribeLinksOptions {
  rss?: string
  links?: {
    youtube?: string
    spotify?: string
    apple?: string
  }
}

const defaultOptions = {
  rss: "https://anchor.fm/s/10dbf5b7c/podcast/rss",
  links: {
    youtube: "https://www.youtube.com/@TheAugmentedMindPodcast",
    spotify: "https://open.spotify.com/show/the-am-podcast",
    apple: "https://podcasts.apple.com/podcast/the-am-podcast",
  },
}

export default ((opts?: SubscribeLinksOptions) => {
  const rss = opts?.rss ?? defaultOptions.rss
  const links = { ...defaultOptions.links, ...opts?.links }

  const SubscribeLinks: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    return (
      <div class={classNames(displayClass, "subscribe-links")}>
        <a href={rss} target="_blank" rel="noopener noreferrer" class="subscribe-btn" title="RSS Feed">
          subscribe
        </a>
        <span class="subscribe-divider">|</span>
        <div class="subscribe-icons">
          {links.youtube && (
            <a href={links.youtube} target="_blank" rel="noopener noreferrer" title="YouTube">
              <img src="/static/app-logos/youtube-logo.svg" alt="YouTube" />
            </a>
          )}
          {links.spotify && (
            <a href={links.spotify} target="_blank" rel="noopener noreferrer" title="Spotify">
              <img src="/static/app-logos/spotify-logo.svg" alt="Spotify" />
            </a>
          )}
          {links.apple && (
            <a href={links.apple} target="_blank" rel="noopener noreferrer" title="Apple Podcasts">
              <img src="/static/app-logos/apple-podcasts-logo.svg" alt="Apple Podcasts" />
            </a>
          )}
        </div>
      </div>
    )
  }

  SubscribeLinks.css = `
.subscribe-links {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.75rem 0 1.5rem 0;
}

.subscribe-btn {
  font-size: 0.88rem;
  color: var(--gray);
  font-weight: 500;
  text-transform: lowercase;
  letter-spacing: 0.02em;
  padding: 0.3rem 0.6rem;
  border: 0.25px solid var(--lightgray);
  border-radius: 4px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.subscribe-btn:hover {
  color: var(--secondary);
  border-color: var(--secondary);
  box-shadow: 0 0 0 0.5px var(--secondary);
  background: var(--highlight);
}

.subscribe-divider {
  color: var(--lightgray);
}

.subscribe-icons {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.subscribe-icons a {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  border: 0.25px solid var(--lightgray);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.subscribe-icons a:hover {
  border-color: var(--secondary);
  box-shadow: 0 0 0 0.5px var(--secondary);
  background: var(--highlight);
  transform: translateY(-1px);
}

.subscribe-icons img {
  width: 18px;
  height: 18px;
  opacity: 0.4;
  margin: 0 0;
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.subscribe-icons a:hover img {
  opacity: 1;
  margin: 0 0;
  /* Convert black to var(--secondary) orange #e07b39 */
  filter: invert(56%) sepia(91%) saturate(494%) hue-rotate(341deg) brightness(94%) contrast(89%);
}
`

  return SubscribeLinks
}) satisfies QuartzComponentConstructor
