# Project

## Overview
Augmented Mind is a podcast website (augmented-mind.github.io) built with a JS/TS static site framework. It hosts episode pages (EP00–EP05 currently; EP05 Jeremy Avigad merged via PR #77), each featuring an embedded YouTube video, episode header, timestamps, and summaries. Episode cards on the index route to internal content pages (not directly to YouTube).

## Open Questions
- PR #41 (caption-infra/Transcript.tsx) OPEN/SHIP — ignorePatterns fix applied, ARIA + window.addCleanup added; awaiting human merge. PR #44 (caption-workflow) OPEN/SHIP — stacks on #41; closes #37/#43. Both need human merge before smoke-testing the VTT→MD→ZH pipeline.
- Issue #71 (Wire Guest Post/Discussions) CLOSED; PR #73 CLOSED after maintainer wanted live render from GitHub (no committed .md). Superseded by PR #84 (MERGED 2026-07-21): live /forum via unauthenticated repo Discussions REST body_html, client-side, no build-time sync. discussion #46 (CongJie Pan) links [[ep01]].
- Issue #74 (rename Livestreams → 'Special Events') CLOSED without the rename — content dir stays content/livestreams/. Don't reintroduce a special-events rename unless maintainer reopens.
- Issue #76 (auto-ingest new episodes from RSS/YouTube): PR #80 OPEN — issue-first, zero-credential collector (.agent/src/episode-ingest.ts + cli + agent-episode-ingest.yml hourly cron). Detects new Anchor-RSS episodes and files templated `@sepo-agent /implement` 'Release Episode N' issues (mirrors #31/#75 manual flow), deduped by title. Awaiting human merge.
- PR #87 (Sepo 0.3.1 → v0.5.0, [[github/augmented-mind/augmented-mind.github.io/pull-87.json]]) OPEN as of 2026-08-01, unmerged — repo still runs 0.3.1. Automated .agent/+.github/ infra sync; adds self-improvement + runtime-cache workflows, Linux local-runner, direct-answer triage (AGENT_TRIAGE_MODE), /add-rubrics, live progress comments. On merge: bump the 'Sepo infra at v0.3.1' durable note and check for new agent conventions.
