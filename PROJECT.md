# Project

## Overview
Augmented Mind is a podcast website (augmented-mind.github.io) built with a JS/TS static site framework. It hosts episode pages (EP00–EP04 currently), each featuring an embedded YouTube video, episode header, timestamps, and summaries. Episode cards on the index route to internal content pages (not directly to YouTube).

## Open Questions
- PR #41 (caption-infra/Transcript.tsx) OPEN/SHIP — ignorePatterns fix applied, ARIA + window.addCleanup added; awaiting human merge. PR #44 (caption-workflow) OPEN/SHIP — stacks on #41; closes #37/#43. Both need human merge before smoke-testing the VTT→MD→ZH pipeline.
- Issue #71 (Wire Guest Post/Discussions): PR #73 OPEN, direction still unsettled after 2 maintainer pivots. (1) First pass: content/guest-posts/ + sidebar/carousel. (2) Maintainer (06-07/06-09) wants everything under /forum, dynamically listed, NOT on main page → /fix-pr renamed guest-posts→forum/ (content/forum/, /forum auto-index via Quartz FolderContent, post at /forum/<slug>). (3) Maintainer (06-09): "not what we expected — render post text directly from GitHub, no committed .md". Blocked by static-site constraint (see MEMORY.md); Sepo offered Option A (serverless proxy, live) vs B (build-time sync). Awaiting maintainer choice. discussion #46 (CongJie Pan, "The Human Measure") links [[ep01]].
- Issue #74 (OPEN, awaiting /answer): rename just-merged 'Livestreams' section to 'Special Events' w/ subcategories (meetup, etc.) + drop 'LIVE 01' numbering. Would reshape content/livestreams/ + streamId convention from #66.
