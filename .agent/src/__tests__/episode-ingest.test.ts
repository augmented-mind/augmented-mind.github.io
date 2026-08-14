import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { strict as assert } from "node:assert";

import {
  buildIssueBody,
  buildIssueTitle,
  cleanAppleUrl,
  descriptionToText,
  episodeNumberFromTitle,
  extractAppleEpisodeUrl,
  extractSpotifyEpisodeId,
  findNewEpisode,
  getExistingEpisodeNumbers,
  matchYoutubeUrl,
  parseFeedItems,
  parseYtDlpOutput,
} from "../episode-ingest.js";

const FIXTURE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title><![CDATA[Augmented Mind Podcast]]></title>
    <item>
      <title><![CDATA[It's Our Mathematics with Jeremy Avigad | AM Podcast #5]]></title>
      <description><![CDATA[<p>Jeremy Avigad is a professor at CMU.</p><p>Outline:</p><p>0:00 - Teaser</p><p>References:</p><ul><li><p>Homepage: <a href="https://www.andrew.cmu.edu/user/avigad/" rel="ugc">https://www.andrew.cmu.edu/user/avigad/</a></p></li></ul><p>Spotify: <a href="https://open.spotify.com/show/40KculkYTe2tOpqJm6TAYr?si=x&amp;nd=1">link</a></p><p>Thanks to <a href="https://zixiaowang17.github.io/">Jolene Wang</a>!</p>]]></description>
      <link>https://podcasters.spotify.com/pod/show/x/episodes/ep5</link>
      <guid isPermaLink="false">2eaa0c18-0222-4b8d-96e7-d929a0b62db2</guid>
      <pubDate>Tue, 09 Jun 2026 13:00:00 GMT</pubDate>
      <itunes:episode>5</itunes:episode>
      <itunes:duration>01:01:22</itunes:duration>
      <itunes:image href="https://cdn.example.com/ep5-cover.jpg"/>
    </item>
    <item>
      <title><![CDATA[The Privacy Layer with Ken Liu | AM Podcast #4]]></title>
      <description><![CDATA[<p>Ken Liu is a Stanford PhD student.</p>]]></description>
      <link>https://podcasters.spotify.com/pod/show/x/episodes/ep4</link>
      <guid isPermaLink="false">599631d1-ea7d-4789-8147-934a532c20f6</guid>
      <pubDate>Mon, 04 May 2026 13:00:00 GMT</pubDate>
      <itunes:episode>4</itunes:episode>
      <itunes:duration>00:55:00</itunes:duration>
      <itunes:image href="https://cdn.example.com/ep4-cover.jpg"/>
    </item>
    <item>
      <title><![CDATA[Introducing The Augmented Mind]]></title>
      <description><![CDATA[<p>Trailer.</p>]]></description>
      <link>https://podcasters.spotify.com/pod/show/x/episodes/trailer</link>
      <guid isPermaLink="false">17e2a5a5-cba0-4c68-958f-806ca04f0a42</guid>
      <pubDate>Mon, 01 Jan 2026 13:00:00 GMT</pubDate>
      <itunes:duration>00:02:00</itunes:duration>
      <itunes:image href="https://cdn.example.com/trailer-cover.jpg"/>
    </item>
  </channel>
</rss>`;

test("parseFeedItems extracts episode metadata", () => {
  const items = parseFeedItems(FIXTURE_FEED);
  assert.equal(items.length, 3);

  const ep5 = items[0];
  assert.equal(ep5.episodeNumber, 5);
  assert.equal(ep5.guid, "2eaa0c18-0222-4b8d-96e7-d929a0b62db2");
  assert.equal(ep5.duration, "01:01:22");
  assert.equal(ep5.coverUrl, "https://cdn.example.com/ep5-cover.jpg");
  assert.match(ep5.title, /It's Our Mathematics/);
  assert.match(ep5.descriptionHtml, /Jeremy Avigad/);

  // The trailer has no itunes:episode and no "#N" in the title.
  assert.equal(items[2].episodeNumber, null);
});

test("episodeNumberFromTitle reads hash and word forms", () => {
  assert.equal(episodeNumberFromTitle("Some Title | AM Podcast #7"), 7);
  assert.equal(episodeNumberFromTitle("Release Episode 12 now"), 12);
  assert.equal(episodeNumberFromTitle("No number here"), null);
});

test("getExistingEpisodeNumbers reads epNN.md filenames", () => {
  const dir = mkdtempSync(join(tmpdir(), "episodes-"));
  try {
    for (const name of ["ep00.md", "ep01.md", "ep04.md", "index.md", "notes.txt"]) {
      writeFileSync(join(dir, name), "x", "utf8");
    }
    const numbers = getExistingEpisodeNumbers(dir);
    assert.deepEqual([...numbers].sort((a, b) => a - b), [0, 1, 4]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("findNewEpisode returns lowest missing numbered episode", () => {
  const items = parseFeedItems(FIXTURE_FEED);
  const found = findNewEpisode(items, new Set([0, 1, 2, 3, 4]));
  assert.ok(found);
  assert.equal(found!.episodeNumber, 5);

  // Behind by two: should pick ep4 (lowest missing) before ep5.
  const behind = findNewEpisode(items, new Set([0, 1, 2, 3]));
  assert.equal(behind!.episodeNumber, 4);

  // Nothing missing -> null.
  assert.equal(findNewEpisode(items, new Set([0, 1, 2, 3, 4, 5])), null);
});

test("descriptionToText decodes entities and renders links", () => {
  const items = parseFeedItems(FIXTURE_FEED);
  const text = descriptionToText(items[0].descriptionHtml);
  assert.match(text, /Jeremy Avigad is a professor at CMU\./);
  // URL-only anchor text collapses to the bare URL.
  assert.match(text, /Homepage: https:\/\/www\.andrew\.cmu\.edu\/user\/avigad\//);
  // &amp; in the href is decoded.
  assert.match(text, /si=x&nd=1/);
  // Named anchor becomes a markdown link.
  assert.match(text, /\[Jolene Wang\]\(https:\/\/zixiaowang17\.github\.io\/\)/);
  // No raw HTML tags survive.
  assert.doesNotMatch(text, /<[a-z]/i);
});

test("extractSpotifyEpisodeId reads the embed uri", () => {
  const html = '<script>{"data":{"entity":{"uri":"spotify:episode:7GRrw4m3GDq4thvQUff4TV"}}}</script>';
  assert.equal(extractSpotifyEpisodeId(html), "7GRrw4m3GDq4thvQUff4TV");
  assert.equal(extractSpotifyEpisodeId("<html>nothing</html>"), null);
});

test("cleanAppleUrl strips the uo tracking parameter", () => {
  assert.equal(
    cleanAppleUrl("https://podcasts.apple.com/us/podcast/x/id1868102170?i=1000771878436&uo=4"),
    "https://podcasts.apple.com/us/podcast/x/id1868102170?i=1000771878436",
  );
  assert.equal(
    cleanAppleUrl("https://podcasts.apple.com/us/podcast/x/id123?uo=4"),
    "https://podcasts.apple.com/us/podcast/x/id123",
  );
});

test("extractAppleEpisodeUrl matches on guid", () => {
  const lookup = JSON.stringify({
    resultCount: 3,
    results: [
      { wrapperType: "track", trackName: "Augmented Mind Podcast", trackViewUrl: "https://show" },
      {
        wrapperType: "podcastEpisode",
        episodeGuid: "599631d1-ea7d-4789-8147-934a532c20f6",
        trackViewUrl: "https://podcasts.apple.com/us/podcast/ep4/id1868102170?i=1000765984908&uo=4",
      },
      {
        wrapperType: "podcastEpisode",
        episodeGuid: "2eaa0c18-0222-4b8d-96e7-d929a0b62db2",
        trackViewUrl: "https://podcasts.apple.com/us/podcast/ep5/id1868102170?i=1000771878436&uo=4",
      },
    ],
  });
  assert.equal(
    extractAppleEpisodeUrl(lookup, "2eaa0c18-0222-4b8d-96e7-d929a0b62db2"),
    "https://podcasts.apple.com/us/podcast/ep5/id1868102170?i=1000771878436",
  );
  assert.equal(extractAppleEpisodeUrl("not json", "x"), null);
});

test("parseYtDlpOutput and matchYoutubeUrl pick the right video", () => {
  const entries = parseYtDlpOutput(
    [
      "It's Our Mathematics with Jeremy Avigad | AM Podcast #5\tVh_j64tVGFQ",
      "The Privacy Layer with Ken Liu | AM Podcast #4\trFyHnK7PGrY",
      "",
    ].join("\n"),
  );
  assert.equal(entries.length, 2);
  assert.equal(
    matchYoutubeUrl("It's Our Mathematics with Jeremy Avigad | AM Podcast #5", entries),
    "https://www.youtube.com/watch?v=Vh_j64tVGFQ",
  );
  // No entries -> null.
  assert.equal(matchYoutubeUrl("anything", []), null);
  // Unrelated title falls back to the most recent (first) upload.
  assert.equal(
    matchYoutubeUrl("Completely Different Title", entries),
    "https://www.youtube.com/watch?v=Vh_j64tVGFQ",
  );
});

test("buildIssueBody renders the implement template", () => {
  const body = buildIssueBody({
    agentHandle: "@sepo-agent",
    episodeNumber: 5,
    title: "It's Our Mathematics with Jeremy Avigad | AM Podcast #5",
    descriptionText: "Jeremy Avigad is a professor at CMU.",
    guid: "2eaa0c18-0222-4b8d-96e7-d929a0b62db2",
    coverUrl: "https://cdn.example.com/ep5-cover.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=Vh_j64tVGFQ",
    spotifyUrl: "https://open.spotify.com/episode/7GRrw4m3GDq4thvQUff4TV",
    appleUrl: null,
    feedUrl: "https://anchor.fm/s/10dbf5b7c/podcast/rss",
  });

  assert.equal(buildIssueTitle(5), "Release Episode 5");
  assert.match(body, /@sepo-agent \/implement/);
  assert.match(body, /\*\*Title:\*\* It's Our Mathematics/);
  assert.match(body, /\*\*YouTube:\*\* https:\/\/www\.youtube\.com\/watch\?v=Vh_j64tVGFQ/);
  assert.match(body, /\*\*Spotify:\*\* https:\/\/open\.spotify\.com\/episode\//);
  // Missing Apple link is flagged rather than dropped.
  assert.match(body, /\*\*Apple Podcasts:\*\* _not found/);
  // Hidden dedup marker carries the feed guid.
  assert.match(body, /episode-ingest guid:2eaa0c18-0222-4b8d-96e7-d929a0b62db2/);
});
