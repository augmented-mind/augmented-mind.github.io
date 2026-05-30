# Memory

## Durable
- Auth not configured at install: owner must set CLAUDE_CODE_OAUTH_TOKEN (or OPENAI_API_KEY) + GitHub App secrets (AGENT_APP_ID/AGENT_APP_PRIVATE_KEY or AGENT_PAT)
- Episode pages follow: top embedded YouTube video → compact episode header → Timestamps → References sections (no Key Takeaways). Cards on index route to internal pages, not YouTube directly.
- Giscus comments are live (custom themes, conditional placement on non-index pages); repoId: R_kgDOQ1061w, categoryId: DIC_kwDOQ106184C5cJQ — activated in quartz.layout.ts.
- .agent/dist/ and .agent/node_modules/ are in .gitignore (added in infra update); compiled artifacts no longer at risk of leaking into agent PRs
- Dark mode in custom.scss: use var(--light) for card backgrounds (not hardcoded hex); suppress box-shadows via :root[saved-theme="dark"] block
- When implementing issues, check all comments in the linked issue (not just body) for assets like cover images before flagging them as missing.
- Sepo infra at v0.1.0; new workflows active: agent-update, agent-onboarding, agent-project-manager, agent-release-prepare
- Quartz ignorePatterns and draft:true both exclude files before allFiles is built — components doing allFiles cross-file lookups (e.g. Transcript.tsx) must NOT use either to suppress caption files from the index; use ContentIndex-level path filtering instead.
- Live Streams section: content/live-streams/ dir, ls*.md files, EpisodeCarousel with contentType filter in quartz.layout.ts — pattern for future non-episode content types.
- Surge.sh previews: 'preview' label on an issue triggers deploy to augmented-mind-preview-<PR_NUMBER>.surge.sh (PR-number-based, not issue-number); teardown fires on PR close. Jobs need 'environment: preview' to access SURGE_LOGIN + SURGE_TOKEN secrets.
- Live-stream pages share episode layout: isEpisodePage in quartz.layout.ts/Content.tsx covers live-streams/ slugs (inline header, YouTube embed, suppressed std header).
- Never fabricate episode/stream description text — ls01.md content was hallucinated and required human correction. Use only source material (issue body, tweets, paper titles) for descriptions.
- Content.tsx getYouTubeEmbedUrl handles youtube.com/live/<id> format (added for LS01); live-stream URLs use this format, not standard watch?v= URLs.
