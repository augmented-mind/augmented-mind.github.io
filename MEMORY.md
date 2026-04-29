# Memory

## Durable
- Auth not configured at install: owner must set CLAUDE_CODE_OAUTH_TOKEN (or OPENAI_API_KEY) + GitHub App secrets (AGENT_APP_ID/AGENT_APP_PRIVATE_KEY or AGENT_PAT)
- Episode pages follow: top embedded YouTube video → compact episode header → timestamps/summaries. Cards on index route to internal pages, not YouTube directly.
- Giscus comment widget is wired (custom themes, conditional placement) but requires repoId + categoryId to activate — see PR #20 / issue #18.
- .agent/dist/ is NOT in .gitignore — agent PRs risk including 456+ compiled artifacts; add .agent/dist/ to .gitignore before merging agent-authored PRs (see PR #20 incident)
