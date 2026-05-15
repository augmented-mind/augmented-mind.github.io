#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: vtt-to-md.js <input.vtt> <output.md>');
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');

// Parse VTT: extract text lines, skipping headers, timestamps, and cue ids
const cueTexts = [];
let inHeader = true;

for (const line of raw.split('\n')) {
  const t = line.trim();

  if (inHeader) {
    if (t === '' || t.startsWith('WEBVTT') || t.startsWith('Kind:') || t.startsWith('Language:')) continue;
    inHeader = false;
  }

  if (!t) continue;
  // Timestamp lines
  if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/.test(t)) continue;
  // Cue identifier: pure digits
  if (/^\d+$/.test(t)) continue;
  // NOTE / STYLE / REGION blocks
  if (/^(NOTE|STYLE|REGION)\b/.test(t)) continue;

  // Strip VTT inline tags: <c>, </c>, <00:00:00.000>, <b>, </b>, align/position metadata
  const cleaned = t
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  if (cleaned) cueTexts.push(cleaned);
}

// Deduplicate: YouTube auto-captions use a sliding window where each cue
// repeats the tail of the previous one and adds new words.
// Strategy: for each cue, find how much overlaps with the accumulated buffer,
// then append only the new suffix.
const words = [];

function appendNew(existingWords, newText) {
  const newWords = newText.split(/\s+/).filter(Boolean);
  if (existingWords.length === 0) {
    existingWords.push(...newWords);
    return;
  }
  // Find longest suffix of existingWords that matches prefix of newWords
  const maxCheck = Math.min(existingWords.length, newWords.length);
  let overlap = 0;
  for (let len = maxCheck; len > 0; len--) {
    const tail = existingWords.slice(existingWords.length - len).join(' ').toLowerCase();
    const head = newWords.slice(0, len).join(' ').toLowerCase();
    if (tail === head) {
      overlap = len;
      break;
    }
  }
  existingWords.push(...newWords.slice(overlap));
}

for (const cue of cueTexts) {
  appendNew(words, cue);
}

const fullText = words.join(' ');

// Split into sentences on ., ?, ! followed by space/end, then group into paragraphs
const sentenceRe = /[^.!?]+[.!?]+(?:\s|$)/g;
const sentences = [];
let match;
let lastIndex = 0;
while ((match = sentenceRe.exec(fullText)) !== null) {
  const s = match[0].trim();
  if (s) { sentences.push(s); lastIndex = sentenceRe.lastIndex; }
}

// Catch any trailing text without terminal punctuation
const remainder = fullText.slice(lastIndex).trim();
if (remainder) sentences.push(remainder);

const SENTENCES_PER_PARA = 5;
const paragraphs = [];
for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARA) {
  paragraphs.push(sentences.slice(i, i + SENTENCES_PER_PARA).join(' '));
}

// If no sentence boundaries found, fall back to word-count chunking
if (paragraphs.length === 0 && words.length > 0) {
  const WORDS_PER_PARA = 80;
  for (let i = 0; i < words.length; i += WORDS_PER_PARA) {
    paragraphs.push(words.slice(i, i + WORDS_PER_PARA).join(' '));
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, paragraphs.join('\n\n') + '\n', 'utf8');
console.log(`Wrote ${paragraphs.length} paragraphs to ${outputPath}`);
