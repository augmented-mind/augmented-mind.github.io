import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { SimpleSlug } from "./quartz/util/path"

// Sidebar episodes list (vertical, compact)
const episodesSection = Component.RecentNotes({
  title: "Episodes",
  limit: 20,
  showTags: true,
  filter: (f) => f.slug!.startsWith("episodes/") && f.slug! !== "episodes/index",
  linkToMore: "episodes/" as SimpleSlug,
})

// Landing page episodes carousel (horizontal cards with images)
const episodesCarousel = Component.EpisodeCarousel({
  title: "Episodes",
  limit: 20,
  showTags: true,
  filter: (f) => f.slug!.startsWith("episodes/") && f.slug! !== "episodes/index",
  linkToMore: "episodes/" as SimpleSlug,
})

// Subscribe links for podcast platforms
const subscribeLinks = Component.SubscribeLinks({
  rss: "https://anchor.fm/s/10dbf5b7c/podcast/rss",
  links: {
    youtube: "https://www.youtube.com/@TheAugmentedMindPodcast",
    spotify: "https://open.spotify.com/show/the-am-podcast",
    apple: "https://podcasts.apple.com/podcast/the-am-podcast",
  },
})

// Left sidebar components (used on content pages)
const left = [
  Component.PageTitle(),
  Component.MobileOnly(Component.Spacer()),
  Component.Flex({
    components: [
      { Component: Component.Search(), grow: true },
      { Component: Component.Darkmode() },
    ],
  }),
  Component.DesktopOnly(episodesSection),
]

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    // Show episodes carousel on index page (in center content area)
    Component.ConditionalRender({
      component: episodesCarousel,
      condition: (page) => page.fileData.slug === "index",
    }),
    // On mobile for non-index pages, show episodes list
    Component.MobileOnly(
      Component.ConditionalRender({
        component: episodesSection,
        condition: (page) => page.fileData.slug !== "index",
      })
    ),
  ],
  footer: Component.Footer({
    links: {},
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    // Show date above title on non-index pages
    Component.ConditionalRender({
      component: Component.ContentMeta({ showReadingTime: false }),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    // Show subscribe links only on index page
    Component.ConditionalRender({
      component: subscribeLinks,
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.TagList(),
      condition: (page) => page.fileData.slug !== "index",
    }),
  ],
  left: left.map((c) =>
    Component.ConditionalRender({
      component: c,
      condition: (page) => page.fileData.slug !== "index",
    }),
  ),
  right: [
    Component.Graph({
      localGraph: { showTags: false },
      globalGraph: { showTags: false },
    }),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ].map((c) =>
    Component.ConditionalRender({
      component: c,
      condition: (page) => page.fileData.slug !== "index",
    }),
  ),
}

// components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.ArticleTitle(), Component.ContentMeta()],
  left,
  right: [],
}
