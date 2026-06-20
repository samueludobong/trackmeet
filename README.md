<div align="center">
  <img src="assets/images/icon.png" alt="Track Meet" width="96" height="96" />

  # Track Meet

  **A music-first social network where you listen *together*, in real time.**

  Broadcast what you're playing to your followers, co-listen privately with a friend, share songs and stories, and keep your whole feed in sync with Spotify.

  <p>
    <img alt="Expo SDK 54" src="https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white" />
    <img alt="React Native 0.81" src="https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black" />
    <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white" />
    <img alt="Spotify" src="https://img.shields.io/badge/Spotify-Web%20API-1DB954?logo=spotify&logoColor=white" />
  </p>
  <p>
    <img alt="Status: paused" src="https://img.shields.io/badge/status-paused-9E9E9E" />
  </p>
</div>

---

> ## ⏸️ Project status — paused (June 2026)
>
> Track Meet is **shelved as a learning / portfolio project**. It is not in active development and was never shipped to the app stores.
>
> **Why:** the flagship feature — synced "Meets" — depends on the **Spotify Web API**, which Spotify **locked down for individual developers in February 2026** (development mode capped at 5 Premium users; commercial quota now requires a registered business with 250k+ MAU). That closed the only viable path to an indie launch, so rather than ship the app with its differentiator disabled, it was paused behind feature flags (`EXPO_PUBLIC_MEETS_ENABLED` / `EXPO_PUBLIC_SPOTIFY_ENABLED`, both `false`).
>
> **What still works without Spotify:** the feed, multi-provider song cards, playlists, direct messages & group chats, stories (music + text), and profiles. Song attachment was already pivoted to a **keyless multi-provider resolver** (Odesli / song.link) covering Spotify, Apple Music, YouTube and SoundCloud.
>
> **Resume path:** the timestamp-based sync engine is provider-agnostic, so reviving Meets means swapping the four Spotify player calls for a **YouTube IFrame / `expo-av`** player adapter, then flipping the flags back on. See [Synced listening engine](#synced-listening-engine).

---

## Overview

Track Meet is a cross-platform mobile app (iOS & Android, built with Expo) that turns listening to music into a shared, social experience. It connects to a user's Spotify account to read what they're playing and to drive playback, then layers a full social network on top — a feed, stories, direct messages, profiles, and two flagship "listen together" modes: **Meets** and **Jams**.

The hard part — and the most interesting engineering in the repo — is keeping multiple people's playback **in sync to within a few hundred milliseconds** over the public internet, using only each listener's own Spotify client. That sync engine is described in [Synced listening engine](#synced-listening-engine) below.

> **Note:** Track Meet requires a Spotify account to connect playback, and a [Supabase](https://supabase.com) project for its backend (auth, database, realtime, and storage).

---

## Features

### 🎧 Meets — live listening broadcasts (1 → many)
A **Meet** is a live session where one host plays music and any number of followers tune in and hear the *same song at the same position*, in real time.

- **Synced playback** — listeners' Spotify is kept in lockstep with the host's track and position.
- **Live chat & floating reactions** during the session.
- **Talk mode** — the host can duck the music and talk over the stream (walkie-talkie style, hold-to-speak with a drag-to-lock gesture).
- **Live lyrics** — time-synced lyrics that scroll with the playback position, with on-the-fly [translation](#-lyrics--translation).
- **Gallery-style UI** — swipe seamlessly between Lyrics ◄ Now Playing ► Music Library.
- **Public or private join** — appear on your profile as "listening in", or join invisibly.
- **End-of-meet summary** — the full tracklist played during the session, savable to a playlist.
- **Resume prompts** — rejoin a meet you left, or pick a session back up where it paused.
- **Push notifications** fan out to followers when a host goes live.

### 🔁 Jams — private co-listening (1 ↔ 1)
A **Jam** is a hostless, two-person listening room scoped to a DM conversation. Either friend can hold the "stage" to control playback; the other follows in sync, and control can be handed off back and forth.

### 📰 Feed
A social timeline of posts from people you follow — text, shared songs, polls, photos, videos, and voice notes — with likes, reposts, and poll voting, plus a sticky now-playing strip and quick composer.

### 📸 Stories
Instagram-style ephemeral stories with a composer, a card picker, a design canvas, and a full-screen viewer.

### 💬 Messages
Direct messages and group chats, "notes", song sharing inside chats, and the entry point for starting a Jam.

### 👤 Profiles
Rich user profiles with a now-playing card, pinned song, customizable banner/shape, social links, follower stats, and a **live ring** around the avatar that taps you straight back into an ongoing Meet. Also includes other-user and dedicated artist profiles.

### 🔎 Discover
A discovery surface for finding people, artists, and live Meets.

### 🎤 Lyrics & translation
A full karaoke-style lyrics experience that shows up wherever music plays — your profile's now-playing card, Meets, and Jams.

- **Time-synced ("karaoke") lyrics** — lines highlight and auto-scroll in step with the live playback position, sourced from [lrclib.net](https://lrclib.net) and cached in Supabase so any song someone has already viewed loads instantly (negative results are cached too).
- **AI-powered translation** — translate lyrics into **22 languages** on the fly. Translation runs through a Supabase **Edge Function** backed by **Anthropic's Claude (Haiku)**, with the API key kept server-side; the function also returns the *detected source language*. Each `(track, language)` pair is computed once, ever, and cached in a shared table so every later viewer reads it for free.
- **"First to discover" celebration** — be the first person in the app to ever pull up a song's lyrics and you claim it: a celebratory banner and a confetti burst, tracked via a global discovery claim so it only happens once per song.

### 🟢 Spotify integration
- OAuth **PKCE** connect/reconnect flow with automatic token refresh.
- Real-time now-playing polling, with UI gradients & accents derived from the album art.
- Full playback control (play / pause / seek / skip), search across **songs / artists / albums**, playlist & album browsing, and one-tap "add to playlist".
- Powers the synced playback in Meets and Jams (see below).

---

## Synced listening engine

Each listener drives their *own* Spotify client, so the challenge is making them all converge on the host's position despite network latency and unsynchronized device clocks. The engine combines several techniques:

- **Tiered transport** — durable state (track changes, play/pause, driver hand-offs) is persisted to the database, while ephemeral, high-frequency state (position ticks, intents, presence) rides **Supabase Realtime broadcast** channels to avoid paying a DB round-trip on every update.
- **Clock-offset handshake (Cristian's algorithm)** — listeners ping/pong the host to measure the offset between the two devices' clocks, keeping the lowest-RTT sample (NTP-style). Without this, "elapsed since the host sent" would be poisoned by clock skew.
- **Latency-compensated seeks** — the target position is computed *at the moment the command is issued* (after the playback read), so the round-trip time is already accounted for.
- **Self-calibrating command latency** — instead of a hardcoded constant, the engine *measures* how far off each correction lands and nudges its latency estimate toward zero residual drift, converging per device/network in a few corrections.
- **Drift-only correction** — once the initial seek lands, both clients play at 1× and stay aligned; a low-frequency safety net only re-seeks when drift exceeds tolerance, avoiding playback thrash.
- **Background sync** — a background-fetch task keeps a backgrounded listener recoverable when the app returns to the foreground.

See [`lib/meetSync.ts`](lib/meetSync.ts), [`hooks/useMeetHost.ts`](hooks/useMeetHost.ts), and [`hooks/useMeetListener.ts`](hooks/useMeetListener.ts).

---

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | [Expo](https://expo.dev) SDK 54, [React Native](https://reactnative.dev) 0.81, React 19 |
| Language | TypeScript |
| Routing | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based) |
| Styling | [NativeWind](https://www.nativewind.dev/) (Tailwind CSS) + component StyleSheets |
| Animation & gestures | React Native Reanimated, Gesture Handler, the RN Animated API |
| Backend | [Supabase](https://supabase.com) — Postgres, Auth, Realtime, Storage, **Edge Functions** |
| AI | [Anthropic Claude](https://www.anthropic.com) (Haiku) for lyrics translation, server-side in an Edge Function |
| Music | [Spotify Web API](https://developer.spotify.com/documentation/web-api) (OAuth/PKCE via `expo-auth-session`) + [lrclib.net](https://lrclib.net) lyrics |
| Media | `expo-image`, `expo-video`, `expo-av`, on-device media caching |
| Notifications | `expo-notifications` (push) |
| Background work | `expo-background-fetch` + `expo-task-manager` |

---

## Project structure

```
app/            Expo Router screens (tabs, feed, profiles, stories, auth, spotify-callback)
components/     UI by domain — meets, feed, stories, messages, profile, post, discover, ui, …
hooks/          Stateful logic (useMeetHost, useMeetListener, useNowPlaying, useFeedScreen, …)
services/       Data access against Supabase (meets, posts, messages, stories, playlists, …)
lib/            Cross-cutting modules — spotify/, meetSync, notifications, supabase, config, caches
assets/         Fonts, images, and extracted StyleSheets
supabase/       SQL migrations
constants/      Layout and shared constants
types/          Shared TypeScript types
```

---

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org) (LTS) and npm
- The [Expo](https://docs.expo.dev/get-started/installation/) tooling (`npx expo`)
- A [Supabase](https://supabase.com) project (URL + anon key)
- A [Spotify Developer](https://developer.spotify.com/dashboard) app (client ID + redirect URI)
- A device or emulator. Some features (background sync, real Spotify playback control, push) require a **development build** rather than Expo Go.

### 1. Install
```bash
npm install
```

### 2. Configure environment
Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-SUPABASE-ANON-KEY
# "Production" enables on-device media caching; "Development" always re-fetches.
EXPO_PUBLIC_DEVELOPMENT_STATUS=Development
```

> `EXPO_PUBLIC_*` values are inlined at build time — restart Metro with `expo start -c` after changing them.

The Spotify client ID lives in [`lib/spotify/auth.ts`](lib/spotify/auth.ts); swap in your own Spotify app's client ID and register its redirect URI in the Spotify dashboard.

### 3. Set up the backend
- Apply the SQL in [`supabase/`](supabase/) to your Supabase project (via the SQL editor or CLI) to create the tables, policies, and realtime configuration.
- For lyrics translation, deploy the `translate-lyrics` Supabase **Edge Function** and set your `ANTHROPIC_API_KEY` as a Supabase secret (the app never sees it).

### 4. Run
```bash
npm start        # Expo dev server (choose a target)
npm run android  # Android emulator/device
npm run ios      # iOS simulator/device
npm run web      # web
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` | Open on an Android emulator/device |
| `npm run ios` | Open on an iOS simulator/device |
| `npm run web` | Run in the browser |
| `npm run lint` | Lint with `expo lint` |

---

<div align="center">
  <sub>Built with Expo, Supabase, and the Spotify Web API.</sub>
</div>
