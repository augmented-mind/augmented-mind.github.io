# Memory

## Durable
- Auth not configured at install: owner must set CLAUDE_CODE_OAUTH_TOKEN (or OPENAI_API_KEY) + GitHub App secrets (AGENT_APP_ID/AGENT_APP_PRIVATE_KEY or AGENT_PAT)
- Episode pages follow: top embedded YouTube video → compact episode header → Timestamps → References sections (no Key Takeaways). Cards on index route to internal pages, not YouTube directly.
- Giscus comments are live (custom themes, conditional placement on non-index pages); repoId: R_kgDOQ1061w, categoryId: DIC_kwDOQ106184C5cJQ — activated in quartz.layout.ts.
- .agent/dist/ and .agent/node_modules/ are in .gitignore (added in infra update); compiled artifacts no longer at risk of leaking into agent PRs
- Dark mode in custom.scss: use var(--light) for card backgrounds (not hardcoded hex); suppress box-shadows via :root[saved-theme="dark"] block
- When implementing issues, check all comments in the linked issue (not just body) for assets like cover images before flagging them as missing.
- Sepo infra at v0.3.1; workflows include update-agent, follow-up routing, self-approval, self-merge, agent-onboarding, agent-project-manager. Resolver is JS (not shell); resolve-agent-provider needs local CommonJS package marker since repo root is ESM.
- Quartz ignorePatterns and draft:true both exclude files before allFiles is built — components doing allFiles cross-file lookups (e.g. Transcript.tsx) must NOT use either to suppress caption files from the index; use ContentIndex-level path filtering instead.
- Live Streams section: content/live-streams/ dir, ls*.md files, EpisodeCarousel with contentType filter in quartz.layout.ts — pattern for future non-episode content types.
- Previews use Sepo preview server (preview-api.sepo.sh) via GitHub Actions OIDC — no Surge secrets needed. Standalone preview.yml auto-deploys agent/ PRs; label overrides: sepo-preview (opt in), no-preview (opt out). Tears down on PR close.
- Live-stream pages share episode layout: isEpisodePage in quartz.layout.ts/Content.tsx covers live-streams/ slugs (inline header, YouTube embed, suppressed std header).
- Never fabricate episode/stream description text — ls01.md content was hallucinated and required human correction. Use only source material (issue body, tweets, paper titles) for descriptions.
- Content.tsx getYouTubeEmbedUrl handles youtube.com/live/<id> format (added for LS01); live-stream URLs use this format, not standard watch?v= URLs.
