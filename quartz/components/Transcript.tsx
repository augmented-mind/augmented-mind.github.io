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
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => <p>{p}</p>)}
      </div>
    )

    return (
      <details class="transcript">
        <summary>Transcript</summary>
        {hasBoth ? (
          <div class="transcript-langs">
            <div class="transcript-tab-bar">
              <button class="transcript-tab active" data-tab="en">
                EN
              </button>
              <button class="transcript-tab" data-tab="zh">
                ZH
              </button>
            </div>
            <div class="transcript-panel" data-panel="en">
              {renderContent(enText!)}
            </div>
            <div class="transcript-panel hidden" data-panel="zh">
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
    tab.addEventListener("click", () => {
      const container = bar.closest(".transcript-langs")
      const lang = tab.getAttribute("data-tab")
      bar.querySelectorAll(".transcript-tab").forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")
      container.querySelectorAll(".transcript-panel").forEach((panel) => {
        panel.classList.toggle("hidden", panel.getAttribute("data-panel") !== lang)
      })
    })
  })
})
`

  return Transcript
}) satisfies QuartzComponentConstructor
