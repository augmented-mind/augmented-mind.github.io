#!/usr/bin/env node
// Scaffold a forum post page from a GitHub Discussion.
//
// Usage:
//   node scripts/import-forum-post.mjs <discussion-number> [--slug my-post] [--episode ep01]
//
// Requires the `gh` CLI (authenticated). It fetches the discussion via the
// GraphQL API, downloads any embedded images into
// quartz/static/forum/<slug>/, rewrites the image URLs to local paths,
// and writes content/forum/<slug>.md with author frontmatter.
//
// The generated markdown is a starting point: review the prose, set the
// `coverImage`, and add a `[[<episode>]]` wikilink so the post connects to its
// episode in Graph View.

import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

function parseArgs(argv) {
  const args = { number: undefined, slug: undefined, episode: undefined }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--slug") args.slug = argv[++i]
    else if (a === "--episode") args.episode = argv[++i]
    else if (!a.startsWith("--") && args.number === undefined) args.number = a
  }
  return args
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/^guest post[_:\s-]*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

function fetchDiscussion(number) {
  const query = `query($owner:String!,$repo:String!,$number:Int!){
    repository(owner:$owner,name:$repo){
      discussion(number:$number){
        title body createdAt url
        author{ login url ... on User { name } }
      }
    }
  }`
  const out = execFileSync(
    "gh",
    [
      "api",
      "graphql",
      "-F",
      "owner=augmented-mind",
      "-F",
      "repo=augmented-mind.github.io",
      "-F",
      `number=${number}`,
      "-f",
      `query=${query}`,
    ],
    { encoding: "utf8" },
  )
  const d = JSON.parse(out).data.repository.discussion
  if (!d) throw new Error(`Discussion #${number} not found`)
  return d
}

async function localizeImages(body, slug) {
  const staticDir = join(repoRoot, "quartz", "static", "forum", slug)
  const imageRe = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
  const matches = [...body.matchAll(imageRe)]
  if (matches.length === 0) return body
  mkdirSync(staticDir, { recursive: true })
  let result = body
  let i = 0
  for (const [, alt, url] of matches) {
    i++
    const ext = (
      url.split("?")[0].match(/\.(png|jpe?g|gif|webp|svg)$/i)?.[1] ?? "png"
    ).toLowerCase()
    const name = `image-${i}.${ext}`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`  ! failed to download ${url} (${res.status}); leaving URL as-is`)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(join(staticDir, name), buf)
    const localPath = `/static/forum/${slug}/${name}`
    result = result.replace(`![${alt}](${url})`, `![${alt}](${localPath})`)
    console.log(`  + ${name} (${buf.length} bytes)`)
  }
  return result
}

function frontmatter(d, slug, episode) {
  const title = d.title.replace(/^guest post[_:\s-]*/i, "").replace(/'/g, "''")
  const date = d.createdAt.slice(0, 10)
  const author = (d.author?.name ?? d.author?.login ?? "Unknown").replace(/"/g, '\\"')
  const authorUrl = d.author?.url ?? ""
  const lines = [
    "---",
    `title: '${title}'`,
    `date: ${date}`,
    `author: "${author}"`,
    `authorUrl: "${authorUrl}"`,
    `coverImage: "/static/forum/${slug}/image-1.png"`,
    "guestOffset: 1.275",
    "tags:",
    `  - "${author}"`,
    "---",
    "",
  ]
  const note = episode
    ? `> TODO: link this post to its episode with a wikilink, e.g. [[${episode}|Episode]].\n\n`
    : `> TODO: add a [[<episode>]] wikilink so this post connects to its episode in Graph View.\n\n`
  return lines.join("\n") + note
}

async function main() {
  const { number, slug: slugArg, episode } = parseArgs(process.argv.slice(2))
  if (!number) {
    console.error(
      "Usage: node scripts/import-forum-post.mjs <discussion-number> [--slug ...] [--episode ep01]",
    )
    process.exit(1)
  }
  console.log(`Fetching discussion #${number} ...`)
  const d = fetchDiscussion(number)
  const slug = slugArg ?? slugify(d.title)
  console.log(`Slug: ${slug}`)
  const localizedBody = await localizeImages(d.body, slug)
  const md = frontmatter(d, slug, episode) + localizedBody.trim() + "\n"
  const outPath = join(repoRoot, "content", "forum", `${slug}.md`)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, md)
  console.log(`\nWrote content/forum/${slug}.md`)
  console.log("Next: review the prose, set coverImage, and add the [[episode]] wikilink.")
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
