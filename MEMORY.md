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
- Sibling drafts #49/#53/#56 (live-streams/ + contentType) all CLOSED; issue #65 CLOSED (work landed); issue #48 still open as a dup of that livestream work.
- Previews use Sepo preview server (preview-api.sepo.sh) via GitHub Actions OIDC — no Surge secrets needed. Standalone preview.yml auto-deploys agent/ PRs; label overrides: sepo-preview (opt in), no-preview (opt out). Tears down on PR close.
- Never fabricate episode/stream description text — ls01.md content was hallucinated and required human correction. Use only source material (issue body, tweets, paper titles) for descriptions.
- preview.yml concurrency (sepo-preview-<pr#>, cancel-in-progress) must live on deploy/teardown jobs, NOT workflow-level — workflow-level groups let skipped non-preview label runs cancel active previews (PR #66 race).
- resolve-github-auth call sites must pass the full chain app_id → app_private_key → pat → fallback_token; omitting pat (as PR #68's first pass did) drops Sepo identity in PAT-only fallback configs.
- Pinning a specific Claude model (e.g. claude-opus-4-8) via ACP needs acpx ≥0.10.0; acpx 0.6.1 only advertised default/opus/haiku and rejected explicit pins — bump acpx rather than adding adapter model-env glue.
