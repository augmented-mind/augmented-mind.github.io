# Project

## Overview
Augmented Mind is a podcast website (augmented-mind.github.io) built with a JS/TS static site framework. It hosts episode pages (EP00–EP04 currently), each featuring an embedded YouTube video, episode header, timestamps, and summaries. Episode cards on the index route to internal content pages (not directly to YouTube).

## Open Questions
- PR #41 (caption-infra/Transcript.tsx) OPEN/SHIP — ignorePatterns fix applied, ARIA + window.addCleanup added; awaiting human merge. PR #44 (caption-workflow) OPEN/SHIP — stacks on #41; closes #37/#43. Both need human merge before smoke-testing the VTT→MD→ZH pipeline.
- PR #49 (live-streams section) OPEN — adds content/live-streams/ dir and LS01 entry; awaiting human merge (implements issue #48).
