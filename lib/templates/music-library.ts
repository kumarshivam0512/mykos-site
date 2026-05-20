// ─── Music Library Registry (Sprint A item 2) ────────────────────
//
// Curated, mood-tagged, royalty-free tracks for the Video Studio Music card.
// Files live under `public/music/` and are downloaded by `scripts/download-music.mjs`.
// At runtime, callers use `pickTrackForTemplate()` to auto-select a track that
// matches the ad's vertical + format + tier, and `getTrackById()` to resolve
// the user's manual override.
//
// LICENSING: every track is sourced from Pixabay (CC0-equivalent: commercial
// use OK, no attribution required). The download script auto-writes
// `public/music/LICENSES.md` for compliance documentation.
//
// SAFETY: if a file is missing on disk, `finalize-video` simply assembles
// without music — never errors. This keeps the dev/demo loop fast even before
// the music download step completes.

import type { AdFormat } from "@/lib/types";

export interface MusicTrack {
  id: string;            // stable key — also the filename stem (no extension)
  title: string;         // human-friendly title for the dropdown
  mood: string;          // searchable mood tag ("cinematic", "ugc", "luxe")
  bpm: number;           // approximate beats per minute
  genre: string;         // descriptive genre
  durationSec: number;   // total length in seconds
  /** Source URL used during download (kept for LICENSES.md regeneration). */
  sourceUrl?: string;
  /** Best-fit ad formats for auto-pick. */
  formats: AdFormat[];
}

/**
 * Twelve mood-tagged tracks covering the main ad templates. The catalogue is
 * intentionally small — too many choices paralyses the user. Auto-pick
 * defaults to the first track in the format's filter list.
 */
export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "cinematic-piano-60bpm",
    title: "Cinematic Piano · slow & emotive",
    mood: "cinematic",
    bpm: 60,
    genre: "piano",
    durationSec: 120,
    formats: ["cinematic_lifestyle", "minimalist_editorial"],
  },
  {
    id: "cinematic-strings-hopeful",
    title: "Hopeful Strings · rising arc",
    mood: "cinematic",
    bpm: 72,
    genre: "orchestral",
    durationSec: 140,
    formats: ["cinematic_lifestyle", "product_showcase"],
  },
  {
    id: "luxury-ambient-warm",
    title: "Luxury Ambient · warm pads",
    mood: "luxe",
    bpm: 60,
    genre: "ambient",
    durationSec: 180,
    formats: ["minimalist_editorial", "product_showcase"],
  },
  {
    id: "intimate-piano-editorial",
    title: "Intimate Piano · editorial soft",
    mood: "luxe",
    bpm: 55,
    genre: "piano",
    durationSec: 130,
    formats: ["minimalist_editorial"],
  },
  {
    id: "upbeat-ukulele",
    title: "Upbeat Ukulele · friendly",
    mood: "warm",
    bpm: 110,
    genre: "folk",
    durationSec: 120,
    formats: ["testimonial_ugc", "animated_explainer"],
  },
  {
    id: "acoustic-guitar-warm",
    title: "Acoustic Guitar · warm strum",
    mood: "warm",
    bpm: 100,
    genre: "folk",
    durationSec: 130,
    formats: ["testimonial_ugc", "cinematic_lifestyle"],
  },
  {
    id: "trap-workout-build",
    title: "Trap Workout · big build",
    mood: "energetic",
    bpm: 140,
    genre: "trap",
    durationSec: 110,
    formats: ["energetic_sports"],
  },
  {
    id: "electronic-drop-edm",
    title: "Electronic Drop · EDM banger",
    mood: "energetic",
    bpm: 128,
    genre: "edm",
    durationSec: 130,
    formats: ["energetic_sports"],
  },
  {
    id: "electronic-ambient-drone",
    title: "Electronic Ambient · drone bed",
    mood: "clinical",
    bpm: 70,
    genre: "ambient",
    durationSec: 150,
    formats: ["product_showcase", "animated_explainer"],
  },
  {
    id: "clinical-minimal-ambient",
    title: "Clinical Minimal · sparse tech",
    mood: "clinical",
    bpm: 80,
    genre: "ambient",
    durationSec: 130,
    formats: ["product_showcase", "animated_explainer"],
  },
  {
    id: "indie-pop-light",
    title: "Indie Pop · light & bouncy",
    mood: "warm",
    bpm: 115,
    genre: "pop",
    durationSec: 130,
    formats: ["testimonial_ugc", "cinematic_lifestyle"],
  },
  {
    id: "silence",
    title: "(no music)",
    mood: "silence",
    bpm: 0,
    genre: "silence",
    durationSec: 0,
    formats: [],
  },
];

/**
 * Lookup a track by id. Returns undefined when the user picks a track that
 * isn't in the catalogue (e.g. a stale persisted selection after we trim the
 * catalogue) — callers should fall back to auto-pick.
 */
export function getTrackById(id: string | undefined): MusicTrack | undefined {
  if (!id) return undefined;
  return MUSIC_TRACKS.find((t) => t.id === id);
}

/**
 * Pick the best track for an ad format. Picks the first registered track
 * whose `formats` includes the requested format. Falls back to
 * cinematic-piano-60bpm for unmapped formats (safest, most universally OK
 * background bed).
 */
export function pickTrackForTemplate(format: AdFormat | undefined): MusicTrack {
  if (!format) return MUSIC_TRACKS[0];
  const match = MUSIC_TRACKS.find((t) => t.formats.includes(format));
  return match ?? MUSIC_TRACKS[0];
}

/** All tracks except the "silence" sentinel — for dropdown options. */
export const SELECTABLE_TRACKS = MUSIC_TRACKS.filter((t) => t.id !== "silence");

/** Public URL for the track's file (cache-busted). Returns undefined when
 *  the track is the silence sentinel. */
export function trackPublicUrl(track: MusicTrack | undefined): string | undefined {
  if (!track || track.id === "silence") return undefined;
  return `/music/${track.id}.mp3`;
}

// ─── Ambient bed library (Sprint A item 3) ───────────────────────
//
// Background ambience mixed UNDER the music for testimonial_ugc template.
// Adds the "I'm-actually-in-a-cafe" texture that pushes UGC ads toward
// authentic instead of studio-clean.

export interface AmbientBed {
  id: string;
  title: string;
  /** Filename in `public/music/ambient/`. */
  file: string;
  sourceUrl?: string;
}

export const AMBIENT_BEDS: AmbientBed[] = [
  { id: "cafe",        title: "Café noise · chatter & cups",  file: "cafe.mp3" },
  { id: "kitchen",     title: "Kitchen · clatter & sizzle",   file: "kitchen.mp3" },
  { id: "street",      title: "Street · light traffic",       file: "street.mp3" },
  { id: "room-tone",   title: "Room tone · quiet indoor",     file: "room-tone.mp3" },
  { id: "office",      title: "Office hum · keyboard & HVAC", file: "office.mp3" },
  { id: "park",        title: "Park outdoor · birds & wind",  file: "park.mp3" },
  { id: "coffee-shop", title: "Coffee shop · espresso bar",   file: "coffee-shop.mp3" },
  { id: "gym",         title: "Gym ambient · weights & cardio", file: "gym.mp3" },
];

export function getAmbientById(id: string | undefined): AmbientBed | undefined {
  if (!id) return undefined;
  return AMBIENT_BEDS.find((a) => a.id === id);
}

/** Auto-pick: cafe noise — the most universally on-brand ambient bed for
 *  UGC testimonials. Users can override in the Music card. */
export function pickAmbientForTemplate(format: AdFormat | undefined): AmbientBed | undefined {
  if (format !== "testimonial_ugc") return undefined;
  return AMBIENT_BEDS[0];
}

export function ambientPublicUrl(bed: AmbientBed | undefined): string | undefined {
  if (!bed) return undefined;
  return `/music/ambient/${bed.file}`;
}
