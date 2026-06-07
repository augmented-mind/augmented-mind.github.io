import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { SimpleSlug } from "./quartz/util/path"

const isSeriesPage = (slug?: string) =>
  (slug?.startsWith("episodes/") && slug !== "episodes/index") ||
  (slug?.startsWith("livestreams/") && slug !== "livestreams/index")

// Guest posts render their own title/author header (see Content.tsx), so the
// default ArticleTitle/ContentMeta are suppressed like series pages.
const isGuestPost = (slug?: string) =>
  Boolean(slug?.startsWith("guest-posts/") && slug !== "guest-posts/index")

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

// Sidebar livestreams list (vertical, compact)
const livestreamsSection = Component.RecentNotes({
  title: "Livestreams",
  limit: 20,
  showTags: true,
  filter: (f) => f.slug!.startsWith("livestreams/") && f.slug! !== "livestreams/index",
  linkToMore: "livestreams/" as SimpleSlug,
})

// Landing page livestreams carousel (horizontal cards with images)
const livestreamsCarousel = Component.EpisodeCarousel({
  title: "Livestreams",
  limit: 20,
  showTags: false,
  itemNoun: "livestream",
  filter: (f) => f.slug!.startsWith("livestreams/") && f.slug! !== "livestreams/index",
  linkToMore: "livestreams/" as SimpleSlug,
})

// Sidebar guest posts list (vertical, compact)
const guestPostsSection = Component.RecentNotes({
  title: "Guest Posts",
  limit: 20,
  showTags: false,
  filter: (f) => f.slug!.startsWith("guest-posts/") && f.slug! !== "guest-posts/index",
  linkToMore: "guest-posts/" as SimpleSlug,
})

// Landing page guest posts carousel (horizontal cards with images)
const guestPostsCarousel = Component.EpisodeCarousel({
  title: "Guest Posts",
  limit: 20,
  showTags: true,
  itemNoun: "guest post",
  filter: (f) => f.slug!.startsWith("guest-posts/") && f.slug! !== "guest-posts/index",
  linkToMore: "guest-posts/" as SimpleSlug,
})

// Scrollable desktop sidebar group; keeps title/search pinned while the series lists scroll.
const sidebarSeriesSections = Component.Flex({
  className: "sidebar-series-sections",
  direction: "column",
  gap: "0",
  components: [
    { Component: episodesSection, shrink: false, align: "stretch" },
    { Component: livestreamsSection, shrink: false, align: "stretch" },
    { Component: guestPostsSection, shrink: false, align: "stretch" },
  ],
})

// Subscribe links for podcast platforms
const subscribeLinks = Component.SubscribeLinks({
  rss: "https://anchor.fm/s/10dbf5b7c/podcast/rss",
  links: {
    youtube: "https://www.youtube.com/@Augmented-Mind",
    spotify: "https://open.spotify.com/show/40KculkYTe2tOpqJm6TAYr?si=PU_UncsMT4mXjVNCRwoXog",
    apple: "https://podcasts.apple.com/us/podcast/augmented-mind-podcast/id1868102170",
    twitter: "https://x.com/augmind_fm",
  },
})

// Left sidebar components (used on content pages)
const left = [
  Component.PageTitle(),
  Component.MobileOnly(Component.Spacer()),
  Component.MobileOnly(Component.Darkmode()),
  Component.MobileOnly(Component.Search()),
  Component.DesktopOnly(
    Component.Flex({
      components: [
        { Component: Component.Search(), grow: true },
        { Component: Component.Darkmode() },
      ],
    }),
  ),
  Component.DesktopOnly(sidebarSeriesSections),
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
    // Show livestreams carousel on index page (in center content area)
    Component.ConditionalRender({
      component: livestreamsCarousel,
      condition: (page) => page.fileData.slug === "index",
    }),
    // Show guest posts carousel on index page (in center content area)
    Component.ConditionalRender({
      component: guestPostsCarousel,
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.GuestSuggestion(),
      condition: (page) => page.fileData.slug === "index",
    }),
    // On mobile for non-index pages, show episodes list
    Component.MobileOnly(
      Component.ConditionalRender({
        component: episodesSection,
        condition: (page) => page.fileData.slug !== "index",
      }),
    ),
    // On mobile for non-index pages, show livestreams list
    Component.MobileOnly(
      Component.ConditionalRender({
        component: livestreamsSection,
        condition: (page) => page.fileData.slug !== "index",
      }),
    ),
    // On mobile for non-index pages, show guest posts list
    Component.MobileOnly(
      Component.ConditionalRender({
        component: guestPostsSection,
        condition: (page) => page.fileData.slug !== "index",
      }),
    ),
    // Forum/Comments Section
    // Positioned in afterBody to ensure it appears at the bottom of the main content
    Component.ConditionalRender({
      component: Component.Comments({
        provider: "giscus",
        options: {
          repo: "augmented-mind/augmented-mind.github.io",
          repoId: "R_kgDOQ1061w",
          category: "General",
          categoryId: "DIC_kwDOQ106184C5cJQ",
          mapping: "url",
          strict: true,
          reactionsEnabled: true,
          inputPosition: "bottom",
        },
      }),
      condition: (page) => page.fileData.slug !== "index",
    }),
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
      condition: (page) =>
        page.fileData.slug !== "index" &&
        !isSeriesPage(page.fileData.slug) &&
        !isGuestPost(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => !isSeriesPage(page.fileData.slug) && !isGuestPost(page.fileData.slug),
    }),
    // Show subscribe links only on index page
    Component.ConditionalRender({
      component: subscribeLinks,
      condition: (page) => page.fileData.slug === "index",
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
