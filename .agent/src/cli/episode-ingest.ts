// CLI: detect a newly published podcast episode and emit a templated
// `/implement` issue for the agent pipeline to turn into a website PR.
//
// Usage: node .agent/dist/cli/episode-ingest.js
// Env (all optional, sensible defaults for the Augmented Mind podcast):
//   FEED_URL, EPISODES_DIR, ITUNES_PODCAST_ID, SPOTIFY_SHOW_ID,
//   YOUTUBE_CHANNEL_URL, AGENT_HANDLE, COVER_OUTPUT
// Outputs: has_new_episode, episode_number, episode_guid, issue_title,
//   issue_body_file, cover_url, cover_path, youtube_url, spotify_url, apple_url
//
// Every external lookup degrades gracefully: a missing link is reported in
// the issue rather than failing the run. yt-dlp is optional — when it is
// absent or YouTube blocks the runner, the YouTube link is left blank.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildIssueBody,
  buildIssueTitle,
  descriptionToText,
  extractAppleEpisodeUrl,
  extractSpotifyEpisodeId,
  findNewEpisode,
  getExistingEpisodeNumbers,
  issueGuidMarker,
  matchYoutubeUrl,
  parseFeedItems,
  parseYtDlpOutput,
  spotifyEpisodeUrl,
} from "../episode-ingest.js";
import { setOutput } from "../output.js";

const FEED_URL = process.env.FEED_URL || "https://anchor.fm/s/10dbf5b7c/podcast/rss";
const EPISODES_DIR = process.env.EPISODES_DIR || "content/episodes";
const ITUNES_PODCAST_ID = process.env.ITUNES_PODCAST_ID || "1868102170";
const SPOTIFY_SHOW_ID = process.env.SPOTIFY_SHOW_ID || "40KculkYTe2tOpqJm6TAYr";
const YOUTUBE_CHANNEL_URL =
  process.env.YOUTUBE_CHANNEL_URL || "https://www.youtube.com/@Augmented-Mind/videos";
const AGENT_HANDLE = process.env.AGENT_HANDLE || "@sepo-agent";
const COVER_OUTPUT = process.env.COVER_OUTPUT || "";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`Fetch ${url} -> HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error(`Fetch ${url} failed: ${(err as Error).message}`);
    return null;
  }
}

async function downloadCover(url: string, dest: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`Cover download -> HTTP ${res.status}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buffer);
    return true;
  } catch (err) {
    console.error(`Cover download failed: ${(err as Error).message}`);
    return false;
  }
}

function listYoutubeUploads(channelUrl: string): string {
  try {
    return execFileSync(
      "yt-dlp",
      [
        "--flat-playlist",
        "--playlist-end",
        "15",
        "--print",
        "%(title)s\t%(id)s",
        channelUrl,
      ],
      { stdio: ["ignore", "pipe", "pipe"], timeout: 90_000 },
    ).toString("utf8");
  } catch (err) {
    console.error(`yt-dlp lookup failed: ${(err as Error).message}`);
    return "";
  }
}

async function main(): Promise<void> {
  const feedXml = await fetchText(FEED_URL);
  if (!feedXml) {
    throw new Error(`Could not fetch RSS feed at ${FEED_URL}`);
  }

  const items = parseFeedItems(feedXml);
  const existing = getExistingEpisodeNumbers(EPISODES_DIR);
  const episode = findNewEpisode(items, existing);

  if (!episode || episode.episodeNumber === null) {
    console.log("No new episode detected.");
    setOutput("has_new_episode", "false");
    return;
  }

  const episodeNumber = episode.episodeNumber;
  console.log(`New episode detected: #${episodeNumber} — ${episode.title}`);

  // Apple Podcasts (no auth) — match the iTunes Lookup result on guid.
  let appleUrl: string | null = null;
  const lookup = await fetchText(
    `https://itunes.apple.com/lookup?id=${ITUNES_PODCAST_ID}&entity=podcastEpisode&limit=20`,
  );
  if (lookup) appleUrl = extractAppleEpisodeUrl(lookup, episode.guid);

  // Spotify (no auth) — server-rendered embed exposes the latest episode id.
  let spotifyUrl: string | null = null;
  const embed = await fetchText(`https://open.spotify.com/embed/show/${SPOTIFY_SHOW_ID}`);
  if (embed) {
    const id = extractSpotifyEpisodeId(embed);
    if (id) spotifyUrl = spotifyEpisodeUrl(id);
  }

  // YouTube (no auth) — yt-dlp lists uploads; match by title, fall back latest.
  const ytEntries = parseYtDlpOutput(listYoutubeUploads(YOUTUBE_CHANNEL_URL));
  const youtubeLink = matchYoutubeUrl(episode.title, ytEntries);

  // Cover image from the feed (optional download for inspection/artifact).
  let coverPath = "";
  if (COVER_OUTPUT && episode.coverUrl) {
    const ok = await downloadCover(episode.coverUrl, COVER_OUTPUT);
    if (ok) coverPath = COVER_OUTPUT;
  }

  const descriptionText = descriptionToText(episode.descriptionHtml);
  const issueTitle = buildIssueTitle(episodeNumber);
  const issueBody = buildIssueBody({
    agentHandle: AGENT_HANDLE,
    episodeNumber,
    title: episode.title,
    descriptionText,
    guid: episode.guid,
    coverUrl: episode.coverUrl,
    youtubeUrl: youtubeLink,
    spotifyUrl,
    appleUrl,
    feedUrl: FEED_URL,
  });

  const runnerTemp = process.env.RUNNER_TEMP || "/tmp";
  const bodyFile = join(runnerTemp, "episode-issue-body.md");
  writeFileSync(bodyFile, issueBody + "\n", "utf8");

  setOutput("has_new_episode", "true");
  setOutput("episode_number", String(episodeNumber));
  setOutput("episode_guid", episode.guid);
  setOutput("issue_guid_marker", issueGuidMarker(episode.guid));
  setOutput("issue_title", issueTitle);
  setOutput("issue_body_file", bodyFile);
  setOutput("cover_url", episode.coverUrl);
  setOutput("cover_path", coverPath);
  setOutput("youtube_url", youtubeLink ?? "");
  setOutput("spotify_url", spotifyUrl ?? "");
  setOutput("apple_url", appleUrl ?? "");

  console.log(`Prepared issue "${issueTitle}" (body: ${bodyFile})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
