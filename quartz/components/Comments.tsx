import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
// @ts-ignore
import script from "./scripts/comments.inline"

type Options = {
  provider: "giscus"
  options: {
    repo: `${string}/${string}`
    repoId: string
    category: string
    categoryId: string
    themeUrl?: string
    lightTheme?: string
    darkTheme?: string
    mapping?: "url" | "title" | "og:title" | "specific" | "number" | "pathname"
    strict?: boolean
    reactionsEnabled?: boolean
    inputPosition?: "top" | "bottom"
    lang?: string
  }
}

function boolToStringBool(b: boolean): string {
  return b ? "1" : "0"
}

export default ((opts: Options) => {
  const Comments: QuartzComponent = ({ displayClass, fileData, cfg }: QuartzComponentProps) => {
    // check if comments should be displayed according to frontmatter
    const disableComment: boolean =
      typeof fileData.frontmatter?.comments !== "undefined" &&
      (!fileData.frontmatter?.comments || fileData.frontmatter?.comments === "false")
    if (disableComment) {
      return <></>
    }

    // Showing a visual placeholder for now (AMA Node or Forum Node) 
    // when the repoId is still set instead of the placeholder string. 
    const isPlaceholder = opts.options.repoId.includes("_X_")

    return (
      <div class={classNames(displayClass, "comments-area")}>
        {isPlaceholder && (
          <div style={{
            padding: "2rem",
            border: "2px dashed #e07b39", // orange dashed border
            borderRadius: "8px",
            textAlign: "center",
            color: "#e07b39",
            marginTop: "2rem",
            marginBottom: "1rem",
            backgroundColor: "rgba(224, 123, 57, 0.05)"
          }}>
            {/* TODO: Add a link to the GitHub Discussions page. Thinking AMA for people, Forum for other pages. */}
            <p><strong>{fileData.slug?.startsWith("people/") ? "AMA Node" : "Forum Node"} (Coming Soon)</strong></p>
            <p style={{ fontSize: "0.8rem" }}>Next: Enable GitHub Discussions + update repoId/categoryId to activate.</p>
          </div>
        )}
        {/* The giscus div is where the external iframe will be injected */}
        <div
          class="giscus"
          data-repo={opts.options.repo}
          data-repo-id={opts.options.repoId}
          data-category={opts.options.category}
          data-category-id={opts.options.categoryId}
          data-mapping={opts.options.mapping ?? "url"}
          data-strict={boolToStringBool(opts.options.strict ?? true)}
          data-reactions-enabled={boolToStringBool(opts.options.reactionsEnabled ?? true)}
          data-input-position={opts.options.inputPosition ?? "bottom"}
          data-light-theme={opts.options.lightTheme ?? "light"}
          data-dark-theme={opts.options.darkTheme ?? "dark"}
          data-theme-url={
            opts.options.themeUrl ?? `https://${cfg.baseUrl ?? "example.com"}/static/giscus`
          }
          data-lang={opts.options.lang ?? "en"}
        ></div>
      </div>
    )
  }

  Comments.afterDOMLoaded = script

  return Comments
}) satisfies QuartzComponentConstructor<Options>
