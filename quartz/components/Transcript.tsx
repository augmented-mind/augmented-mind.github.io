import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

// frontmatter: captionEn: /captions/ep00.en.md, captionZh: /captions/ep00.zh.md (optional)
export default (() => {
  const Transcript: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const captionEnPath = fileData.frontmatter?.captionEn as string | undefined
    const captionZhPath = fileData.frontmatter?.captionZh as string | undefined

    if (!captionEnPath && !captionZhPath) return null

    const pathToSlug = (path: string) => path.replace(/^\//, "").replace(/\.md$/, "")

    const findText = (path: string): string | null => {
      const slug = pathToSlug(path)
      const file = allFiles.find((f) => f.slug === slug)
      return file?.text ?? null
    }

    const enText = captionEnPath ? findText(captionEnPath) : null
    const zhText = captionZhPath ? findText(captionZhPath) : null

    if (!enText && !zhText) return null

    const hasBoth = !!(enText && zhText)

    const renderContent = (text: string) => (
      <div class="transcript-body">
        {text
          .split(/\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => <p dangerouslySetInnerHTML={{ __html: p }} />)}
      </div>
    )

    return (
      <details class="transcript">
        <summary>Transcript</summary>
        {hasBoth ? (
          <div class="transcript-langs">
            <div class="transcript-tab-bar" role="tablist">
              <button role="tab" aria-selected="true" aria-controls="panel-en" class="transcript-tab active" data-tab="en" tabIndex={0}>
                EN
              </button>
              <button role="tab" aria-selected="false" aria-controls="panel-zh" class="transcript-tab" data-tab="zh" tabIndex={-1}>
                ZH
              </button>
            </div>
            <div id="panel-en" role="tabpanel" class="transcript-panel" data-panel="en">
              {renderContent(enText!)}
            </div>
            <div id="panel-zh" role="tabpanel" class="transcript-panel hidden" data-panel="zh">
              {renderContent(zhText!)}
            </div>
          </div>
        ) : (
          renderContent((enText ?? zhText)!)
        )}
      </details>
    )
  }

  Transcript.css = `
.transcript {
  margin: 2rem 0 1rem;
  border: 0.5px solid var(--lightgray);
  border-radius: 6px;
  overflow: hidden;
}

.transcript > summary {
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--secondary);
  cursor: pointer;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--light);
}

.transcript > summary::-webkit-details-marker {
  display: none;
}

.transcript > summary::before {
  content: "▶";
  font-size: 0.65rem;
  transition: transform 0.2s ease;
  color: var(--gray);
}

.transcript[open] > summary::before {
  transform: rotate(90deg);
}

.transcript-langs {
  padding: 0 1rem 1rem;
}

.transcript-tab-bar {
  display: flex;
  gap: 0.4rem;
  padding: 0.75rem 0 0.5rem;
  border-bottom: 0.5px solid var(--lightgray);
  margin-bottom: 0.75rem;
}

.transcript-tab {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.65rem;
  border: 0.5px solid var(--lightgray);
  border-radius: 4px;
  background: transparent;
  color: var(--gray);
  cursor: pointer;
  transition: all 0.15s ease;
}

.transcript-tab.active {
  background: var(--secondary);
  border-color: var(--secondary);
  color: var(--light);
}

.transcript-panel.hidden {
  display: none;
}

.transcript-body {
  padding: 0.25rem 0;
}

.transcript-body p {
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--darkgray);
  margin: 0 0 0.75rem;
}

.transcript-body p:last-child {
  margin-bottom: 0;
}

.transcript > .transcript-body {
  padding: 0.75rem 1rem 1rem;
}

:root[saved-theme="dark"] .transcript {
  border-color: var(--lightgray);
}
`

  Transcript.afterDOMLoaded = `
document.querySelectorAll(".transcript-tab-bar").forEach((bar) => {
  bar.querySelectorAll(".transcript-tab").forEach((tab) => {
    const handler = () => {
      const container = bar.closest(".transcript-langs")
      const lang = tab.getAttribute("data-tab")
      bar.querySelectorAll(".transcript-tab").forEach((t) => {
        t.classList.remove("active")
        t.setAttribute("aria-selected", "false")
        t.setAttribute("tabindex", "-1")
      })
      tab.classList.add("active")
      tab.setAttribute("aria-selected", "true")
      tab.setAttribute("tabindex", "0")
      container.querySelectorAll(".transcript-panel").forEach((panel) => {
        panel.classList.toggle("hidden", panel.getAttribute("data-panel") !== lang)
      })
    }
    tab.addEventListener("click", handler)
    window.addCleanup(() => tab.removeEventListener("click", handler))
  })

  const keyHandler = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    const tabs = Array.from(bar.querySelectorAll(".transcript-tab"))
    const activeIndex = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true")
    const dir = e.key === "ArrowRight" ? 1 : -1
    const nextIndex = (activeIndex + dir + tabs.length) % tabs.length
    tabs[nextIndex].click()
    tabs[nextIndex].focus()
  }
  bar.addEventListener("keydown", keyHandler)
  window.addCleanup(() => bar.removeEventListener("keydown", keyHandler))
})
`

  return Transcript
}) satisfies QuartzComponentConstructor
