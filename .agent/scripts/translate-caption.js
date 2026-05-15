#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: translate-caption.js <input.en.md> <output.zh.md>');
  process.exit(1);
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey });

const SYSTEM_PROMPT =
  'You are a professional translator. Translate the following English podcast transcript to Simplified Chinese. ' +
  'Preserve paragraph breaks. Output only the translation, no commentary.';

// Split text into chunks by paragraph, targeting ~800 words per chunk
function splitIntoChunks(text, maxWords = 800) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = [];
  let wordCount = 0;

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).length;
    if (wordCount + paraWords > maxWords && current.length > 0) {
      chunks.push(current.join('\n\n'));
      current = [];
      wordCount = 0;
    }
    current.push(para);
    wordCount += paraWords;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks;
}

async function translateChunk(chunk) {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: chunk }],
  });
  return msg.content[0].text;
}

async function main() {
  const input = fs.readFileSync(inputPath, 'utf8');
  const chunks = splitIntoChunks(input);
  console.log(`Translating ${chunks.length} chunk(s)...`);

  const translated = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  chunk ${i + 1}/${chunks.length}`);
    const result = await translateChunk(chunks[i]);
    translated.push(result);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, translated.join('\n\n') + '\n', 'utf8');
  console.log(`Wrote translation to ${outputPath}`);
}

main().catch((err) => {
  console.error('Translation failed:', err.message);
  process.exit(1);
});
