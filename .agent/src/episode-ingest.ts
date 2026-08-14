// Episode ingest helpers.
//
// Pure parsing/formatting logic for the RSS-triggered episode pipeline:
// parse the Anchor podcast feed, detect episodes not yet on the site,
// convert the HTML description to readable text, derive the Apple /
// Spotify / YouTube links, and build the templated `/implement` issue.
//
// Everything here is deterministic and dependency-free so it can be unit
// tested without network access. Network calls live in
// cli/episode-ingest.ts, which feeds raw responses into these functions.

import { readdirSync } from "node:fs";

export interface FeedItem {
  title: string;
  episodeNumber: number | null;
  descriptionHtml: string;
  guid: string;
  pubDate: string;
  duration: string;
  coverUrl: string;
  link: string;
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&#39;": "'",
  "&#039;": "'",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&[a-zA-Z]+;|&#0\d+;/g, (m) => HTML_ENTITIES[m] ?? m);
}

function stripCdata(value: string): string {
  const match = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return match ? match[1] : value;
}

/** Extracts the inner text of the first `<tag>` in `block` (CDATA-aware). */
export function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(re);
  if (!match) return null;
  return stripCdata(match[1]).trim();
}

/** Extracts an attribute from a self-closing/opening `<tag ... attr="...">`. */
export function extractAttr(block: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}\\s*=\\s*"([^"]*)"`, "i");
  const match = block.match(re);
  return match ? match[1] : null;
}

/** Parses `#5` or `Podcast 5` style episode numbers out of a title. */
export function episodeNumberFromTitle(title: string): number | null {
  const hash = title.match(/#\s*(\d+)/);
  if (hash) return parseInt(hash[1], 10);
  const word = title.match(/\bepisode\s+(\d+)\b/i);
  if (word) return parseInt(word[1], 10);
  return null;
}

/** Parses all `<item>` blocks of the podcast RSS feed. */
export function parseFeedItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  for (const [, block] of blocks) {
    const title = extractTag(block, "title") ?? "";
    const itunesEpisode = extractTag(block, "itunes:episode");
    const episodeNumber = itunesEpisode
      ? parseInt(itunesEpisode, 10)
      : episodeNumberFromTitle(title);
    items.push({
      title,
      episodeNumber: Number.isFinite(episodeNumber as number) ? (episodeNumber as number) : null,
      descriptionHtml: extractTag(block, "description") ?? "",
      guid: extractTag(block, "guid") ?? "",
      pubDate: extractTag(block, "pubDate") ?? "",
      duration: extractTag(block, "itunes:duration") ?? "",
      coverUrl: extractAttr(block, "itunes:image", "href") ?? "",
      link: extractTag(block, "link") ?? "",
    });
  }
  return items;
}

/** Reads `content/episodes/epNN.md` filenames and returns their numbers. */
export function getExistingEpisodeNumbers(episodesDir: string): Set<number> {
  const numbers = new Set<number>();
  let entries: string[];
  try {
    entries = readdirSync(episodesDir);
  } catch {
    return numbers;
  }
  for (const name of entries) {
    const match = name.match(/^ep(\d+)\.md$/i);
    if (match) numbers.add(parseInt(match[1], 10));
  }
  return numbers;
}

/**
 * Returns the lowest-numbered feed item whose episode number is not yet
 * present on the site, so episodes are ingested in order, one per run.
 */
export function findNewEpisode(items: FeedItem[], existing: Set<number>): FeedItem | null {
  const candidates = items
    .filter((item) => item.episodeNumber !== null && !existing.has(item.episodeNumber))
    .sort((a, b) => (a.episodeNumber as number) - (b.episodeNumber as number));
  return candidates[0] ?? null;
}

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

/** Converts the RSS HTML description into readable plain/markdown text. */
export function descriptionToText(html: string): string {
  let text = html;
  text = text.replace(/<a\b[^>]*\bhref\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
    const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
    const cleanHref = decodeEntities(href).trim();
    if (!cleanLabel || looksLikeUrl(cleanLabel)) return cleanHref;
    return `[${cleanLabel}](${cleanHref})`;
  });
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|li|ul|ol|h[1-6]|div)>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = decodeEntities(text);
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/** Extracts the `spotify:episode:<id>` from the server-rendered embed page. */
export function extractSpotifyEpisodeId(embedHtml: string): string | null {
  const uri = embedHtml.match(/spotify:episode:([A-Za-z0-9]+)/);
  if (uri) return uri[1];
  const id = embedHtml.match(/"type"\s*:\s*"episode"[\s\S]*?"id"\s*:\s*"([A-Za-z0-9]{22})"/);
  return id ? id[1] : null;
}

export function spotifyEpisodeUrl(id: string): string {
  return `https://open.spotify.com/episode/${id}`;
}

/** Removes Apple's `uo=` tracking parameter while keeping `?i=` episode id. */
export function cleanAppleUrl(url: string): string {
  return url
    .replace(/([?&])uo=\d+(&|$)/i, (_m, sep, tail) => (tail === "&" ? sep : tail === "" ? "" : sep))
    .replace(/[?&]$/, "");
}

/** Finds the Apple Podcasts episode URL from an iTunes Lookup response. */
export function extractAppleEpisodeUrl(lookupJson: string, guid: string): string | null {
  let parsed: { results?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(lookupJson);
  } catch {
    return null;
  }
  const results = parsed.results ?? [];
  const episodes = results.filter(
    (r) => r.wrapperType === "podcastEpisode" || r.kind === "podcast-episode",
  );
  const byGuid = episodes.find((r) => typeof r.episodeGuid === "string" && r.episodeGuid === guid);
  const chosen = byGuid ?? episodes[0];
  const url = chosen?.trackViewUrl;
  return typeof url === "string" && url ? cleanAppleUrl(url) : null;
}

export interface YtEntry {
  title: string;
  id: string;
}

/** Parses `title\tid` lines emitted by `yt-dlp --print`. */
export function parseYtDlpOutput(output: string): YtEntry[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tab = line.lastIndexOf("\t");
      if (tab === -1) return null;
      const title = line.slice(0, tab).trim();
      const id = line.slice(tab + 1).trim();
      return title && id ? { title, id } : null;
    })
    .filter((entry): entry is YtEntry => entry !== null);
}

export function youtubeUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\|.*$/, "") // drop "| AM Podcast #5" suffix
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const setA = new Set(a.split(" ").filter(Boolean));
  const setB = new Set(b.split(" ").filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / Math.max(setA.size, setB.size);
}

/**
 * Matches the RSS episode title to a YouTube upload. Falls back to the most
 * recent upload (first entry) when no title clears the similarity bar, and
 * returns null only when there are no entries at all.
 */
export function matchYoutubeUrl(episodeTitle: string, entries: YtEntry[]): string | null {
  if (entries.length === 0) return null;
  const target = normalizeForMatch(episodeTitle);
  let best: { entry: YtEntry; score: number } | null = null;
  for (const entry of entries) {
    const score = tokenOverlap(target, normalizeForMatch(entry.title));
    if (!best || score > best.score) best = { entry, score };
  }
  if (best && best.score >= 0.5) return youtubeUrl(best.entry.id);
  return youtubeUrl(entries[0].id);
}

export function buildIssueTitle(episodeNumber: number): string {
  return `Release Episode ${episodeNumber}`;
}

export interface IssueBodyParams {
  agentHandle: string;
  episodeNumber: number;
  title: string;
  descriptionText: string;
  guid: string;
  coverUrl: string;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  appleUrl: string | null;
  feedUrl: string;
}

/** Builds the templated `/implement` issue body in the #31/#75 format. */
export function buildIssueBody(params: IssueBodyParams): string {
  const link = (label: string, url: string | null) =>
    url ? `**${label}:** ${url}` : `**${label}:** _not found — please add manually_`;

  return [
    `${params.agentHandle} /implement`,
    "",
    `Episode ${params.episodeNumber} was just published to the [RSS feed](${params.feedUrl}). ` +
      "Please add it to the website, using episodes 1-5 as examples " +
      "(new `content/episodes/epNN.md`, guest page under `content/people/` with cross-links, " +
      "and the cover saved to `quartz/static/covers/EPNN-cover.png`).",
    "",
    `**Title:** ${params.title}`,
    "**Description:**",
    "",
    "```",
    params.descriptionText,
    "```",
    "",
    link("YouTube", params.youtubeUrl),
    link("Spotify", params.spotifyUrl),
    link("Apple Podcasts", params.appleUrl),
    `**Cover Image:** ${params.coverUrl || "_not found in feed_"}`,
    "",
    "---",
    "",
    "_Filed automatically by the episode-ingest workflow from the podcast RSS feed._",
    `<!-- episode-ingest guid:${params.guid} episode:${params.episodeNumber} -->`,
  ].join("\n");
}

/** Stable hidden marker used to dedupe open ingest issues by feed guid. */
export function issueGuidMarker(guid: string): string {
  return `episode-ingest guid:${guid}`;
}
