# Memory

## Durable
- Auth not configured at install: owner must set CLAUDE_CODE_OAUTH_TOKEN (or OPENAI_API_KEY) + GitHub App secrets (AGENT_APP_ID/AGENT_APP_PRIVATE_KEY or AGENT_PAT)
- Episode pages follow: top embedded YouTube video → compact episode header → Timestamps → References sections (no Key Takeaways). Cards on index route to internal pages, not YouTube directly.
- Giscus comments are live (custom themes, conditional placement on non-index pages); repoId: R_kgDOQ1061w, categoryId: DIC_kwDOQ106184C5cJQ — activated in quartz.layout.ts.
- .agent/dist/ and .agent/node_modules/ are in .gitignore (added in infra update); compiled artifacts no longer at risk of leaking into agent PRs
- Dark mode in custom.scss: use var(--light) for card backgrounds (not hardcoded hex); suppress box-shadows via :root[saved-theme="dark"] block
- When implementing issues, check all comments in the linked issue (not just body) for assets like cover images before flagging them as missing.
- Sepo infra at v0.1.0; new workflows active: agent-update, agent-onboarding, agent-project-manager, agent-release-prepare
