# Project

## Overview
Augmented Mind is a podcast website (augmented-mind.github.io) built with a JS/TS static site framework. It hosts episode pages (EP00–EP04 currently), each featuring an embedded YouTube video, episode header, timestamps, and summaries. Episode cards on the index route to internal content pages (not directly to YouTube).

## Open Questions
- PR #41 (caption-infra/Transcript.tsx) OPEN/SHIP — ignorePatterns fix applied, ARIA + window.addCleanup added; awaiting human merge. PR #44 (caption-workflow) OPEN/SHIP — stacks on #41; closes #37/#43. Both need human merge before smoke-testing the VTT→MD→ZH pipeline.
- Issue #71 (Wire Guest Post/Discussions): PR #73 OPEN (closes #71; #58 closed as dup). New content/guest-posts/ section; Content.tsx guest-post header w/ author byline; quartz.layout.ts sidebar+carousel; discussion #46 (CongJie Pan, "The Human Measure") links [[ep01]] in Graph View; scripts/import-guest-post.mjs importer (npm run import:guest-post). Defaults (EP01 link, manual importer not auto-Action, inline byline) chosen absent answers — awaiting human review/merge.
