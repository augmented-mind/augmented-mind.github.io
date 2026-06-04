# Project

## Overview
Augmented Mind is a podcast website (augmented-mind.github.io) built with a JS/TS static site framework. It hosts episode pages (EP00–EP04 currently), each featuring an embedded YouTube video, episode header, timestamps, and summaries. Episode cards on the index route to internal content pages (not directly to YouTube).

## Open Questions
- PR #41 (caption-infra/Transcript.tsx) OPEN/SHIP — ignorePatterns fix applied, ARIA + window.addCleanup added; awaiting human merge. PR #44 (caption-workflow) OPEN/SHIP — stacks on #41; closes #37/#43. Both need human merge before smoke-testing the VTT→MD→ZH pipeline.
- Issue #48 (Live Streams): PR #56 is the newest implementation (supersedes PR #53 and #49), OPEN/SHIP — awaiting human merge. PR #53 is now stale.
- Issue #58 (Wire Guest Post/Discussions to website): opened by external contributor shaoyijia 2026-06-01; sepo-agent blocked (needs OWNER/MEMBER/COLLABORATOR access); maintainer has not responded — needs triage or access grant.
- PR #63 (Sepo v0.1.0 → v0.3.1) OPEN/SHIP — adds update-agent, follow-up routing, self-approval, self-merge workflows; bump MEMORY.md Sepo version bullet on merge.
