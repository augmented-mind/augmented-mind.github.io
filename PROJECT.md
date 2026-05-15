# Project

## Overview
Augmented Mind is a podcast website (augmented-mind.github.io) built with a JS/TS static site framework. It hosts episode pages (EP00–EP04 currently), each featuring an embedded YouTube video, episode header, timestamps, and summaries. Episode cards on the index route to internal content pages (not directly to YouTube).

## Open Questions
- PR #41 (caption-infra/Transcript.tsx) OPEN/NEEDS_REWORK — 1-line fix: remove "captions" from ignorePatterns in quartz.config.ts line 20. PR #44 (caption-workflow: agent-caption-update.yml + vtt-to-md.js + translate-caption.js) at SHIP state per daily log — not yet merged; closes issue #37/#43.
