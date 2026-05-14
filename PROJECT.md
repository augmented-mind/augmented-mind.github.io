# Project

## Overview
Augmented Mind is a podcast website (augmented-mind.github.io) built with a JS/TS static site framework. It hosts episode pages (EP00–EP04 currently), each featuring an embedded YouTube video, episode header, timestamps, and summaries. Episode cards on the index route to internal content pages (not directly to YouTube).

## Open Questions
- Caption work planned (issue #37): store in same repo under content/captions/ (markdown, EN + ZH), two stacked PRs — caption-infra (Transcript.tsx component) then caption-workflow (GH Actions download+translate).
