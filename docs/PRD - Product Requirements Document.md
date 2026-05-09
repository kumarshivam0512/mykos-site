# MYKOS AI — Product Requirements Document (PRD)

**Document Version:** 1.0  
**Date:** May 5, 2026  
**Product Owner:** Mykos AI  
**Status:** MVP Complete, Iterating  

---

## 1. Product Vision

**Mykos AI is the world's first AI Creative Director.**

It takes a product name and turns it into a complete, multi-platform advertising campaign — with buyer personas, competitive strategy, cinematic scene images, video ads with camera motion, voiceover, music, and platform-specific exports — in under 2 hours, for under $5 in API costs.

**Vision Statement:** Every business deserves broadcast-quality advertising, regardless of budget or team size.

---

## 2. Target Users

### Primary: D2C Brand Founders & Solo Marketers
- Revenue: $10K-$500K/month
- Team size: 1-5 people, no dedicated designer or videographer
- Pain: Spending $3K-$10K per campaign at agencies, or producing low-quality DIY content
- Goal: Professional ads that compete with funded competitors

### Secondary: Small Creative Agencies
- Team size: 3-15 people
- Pain: Client volume exceeds production capacity
- Goal: 10x output without hiring, using AI as a production multiplier

### Tertiary: E-commerce Sellers
- Platforms: Amazon, Shopify, social commerce
- Pain: Need constant fresh product content, can't afford photoshoots
- Goal: Consistent product visuals across listings and social ads

---

## 3. User Journey

```
1. BRAND SETUP (5 min)
   └─ Enter product name, description, competitor → AI generates full strategy

2. REVIEW STRATEGY (10 min)
   └─ Review personas, competitor analysis, platform briefs → Edit as needed

3. BUILD SCENES (15 min)
   └─ Create 3-5 scenes with mood, character, location, camera settings
   └─ Insert saved characters (@character) and locations (@location)
   └─ Upload multi-angle product images
   └─ Select realism preset (Standard → Photorealistic → Cinematic → Ultra Raw)

4. GENERATE IMAGES (2-5 min)
   └─ AI generates photorealistic scene images via Higgsfield Soul 2.0
   └─ Product composited into scenes from uploaded angles

5. CREATE VIDEO (5-15 min)
   └─ Set camera motion per scene (push in, orbit, crane, etc.)
   └─ Set duration per scene (3s, 5s, 8s, 10s, 12s)
   └─ Optionally enable Hero Frame for character consistency
   └─ AI generates video clips via Kling 2.1 Pro
   └─ FFmpeg assembles with crossfade transitions + voiceover + music

6. EXPORT (2 min)
   └─ Download poster in 4 formats (landscape, portrait, square, Instagram)
   └─ Download video for YouTube, Instagram Reels, TikTok, Feed

7. TRACK PERFORMANCE (ongoing)
   └─ Log spend, impressions, conversions per channel
   └─ View ROAS, CPA trends
   └─ Get AI budget recommendations
```

---

## 4. Feature Specifications

### 4.1 AI Creative Director (Brand Hub)

**Input:** Product name, description, brand colors, competitor name  
**Output:** Complete CreativeBrief containing:

| Component | Details |
|-----------|---------|
| Product Category | Auto-detected (fitness, beauty, tech, etc.) |
| Target Audience | Age range, gender, platforms, psychographics |
| Buyer Personas (3+) | Name, age, income, location, pain points, motivations, purchase triggers, ad angle |
| Competitor Analysis | Their positioning, their audience, your differentiators, attack angles |
| Platform Briefs (5+) | Per-platform: format, duration, hook, tone, CTA |
| Scene Descriptions (3-5) | Visual prompt, camera angle, motion, lighting, duration |
| Voiceover Script | Full narration script aligned with scenes |
| Music Direction | Genre, tempo, mood for background track |
| Camera Settings | Focal length, aperture, color grade |
| Scene Backdrop | Shared environment description |
| Character Sheet | Shared character appearance description |

**AI Engine:** Google Gemini 2.5 Flash Lite  
**Latency:** 15-30 seconds  
**Cost:** Free (Gemini free tier)

### 4.2 Scene Builder (Creative Hub)

**Per-Scene Inputs:**

| Field | Type | Options |
|-------|------|---------|
| Mood | Dropdown | Aspirational, Energetic, Calm, Luxurious, Playful, Gritty, Professional, Warm, Dramatic, Minimal |
| Setting / Environment | Text + @location | Free text or insert from Location Library |
| Character / Subject Action | Text + @character | Free text or insert from Character Library |
| Product Placement | Text | Position and interaction description |
| Camera Angle | Dropdown | Close-up, Wide shot, Medium shot, Low angle, Overhead, Macro detail, Profile, Over-the-shoulder |
| Lighting | Dropdown | Golden hour, Studio softbox, Natural window, Dramatic rim, Neon-lit, Bright and airy, Warm practical, Cool clinical |
| Color Grade | Dropdown | Warm cinematic, Cool clinical, Orange-teal, Desaturated matte, Vibrant, Moody dark, Bright pastel |

**Ultra-Realism Settings:**

| Setting | Effect |
|---------|--------|
| Film Grain | Subtle 35mm grain texture |
| Lens Imperfections | Chromatic aberration, vignetting, subtle lens flare |
| Depth of Field | Shallow focus with natural bokeh |
| Atmospheric Effects | Dust particles, volumetric haze, light rays |
| Skin & Texture Detail | Visible pores, fabric weave, natural blemishes |
| Environmental Wear | Surface scratches, fingerprints, natural patina |
| Natural Micro-Motion | Hair wisps, fabric settling (video pipeline) |
| Imperfect Composition | Rule-of-thirds tension, slight off-center framing |

**Presets:** Standard, Photorealistic, Cinematic, Ultra Raw

### 4.3 Image Generation Pipeline

```
Scene Builder structured inputs
  → sceneInputToScene() converts to Scene object
  → buildImagePrompt() assembles 10-layer prompt:
      1. Image type/medium (front-loaded for highest weight)
      2. Subject + character sheet
      3. Setting/backdrop
      4. Lighting specification
      5. Lens/camera language (focal length, aperture)
      6. Color & mood
      7. Composition rules (product-focused if product uploaded)
      8. Brand color palette
      9. Quality cues (photorealistic, 4K, ultra-sharp)
     10. Realism boosters + negative block
  → Higgsfield Soul 2.0 API (text-to-image, 1080p)
  → Sharp: resize to 1024×576
  → Sharp: composite product photo with drop shadow (if uploaded)
  → Output: PNG saved to /public/output/
```

**Provider Fallback Chain:** Higgsfield → Pollinations → Replicate → Gemini → Fal.ai

### 4.4 Video Generation Pipeline

```
Generated scene image
  → Per-scene motion settings (camera move, duration, motion prompt)
  → buildVideoPrompt() assembles timeline format:
      Shot intent (100 chars)
      0-1s: Opening frame
      1-4s: Camera performs [named move]; subject motion
      4-5s: Camera settles, composition resolves
      Camera: [named move]
      Subject motion: [description]
      Negatives: [block]
  → Higgsfield Kling 2.1 Pro (image-to-video, 1-12s)
  → MP4 buffer saved to /public/output/

Hero Frame Chaining (optional):
  → User selects one scene as "hero frame"
  → ALL clips use hero frame's source image
  → Each clip gets unique motion prompt
  → Result: same character face across all clips
```

**Video Models Available:**

| Model | Provider | Quality | Cost |
|-------|----------|---------|------|
| Kling 2.1 Standard | Higgsfield | Good | $ |
| Kling 2.1 Pro | Higgsfield | Better | $$ |
| Seedance Pro | Higgsfield | Best | $$$ |
| Wan 2.2 Fast | Replicate | Budget | $ |
| Auto | Smart routing | Varies | Varies |

### 4.5 Video Assembly

```
Video clips + voiceover + music
  → FFmpeg normalizes resolution (scale + pad)
  → xfade crossfade transitions (0.8s)
  → Audio mixing:
      Voiceover: volume 1.0, fade-in 0.3s
      Music: volume 0.15, fade-in 1.0s
      Both: amix with shortest duration
  → Output: final_ad.mp4 (H.264, AAC, faststart)
```

### 4.6 Character Library

| Field | Example |
|-------|---------|
| Name | "Fitness Priya" |
| Gender | Male / Female / Non-binary |
| Age | 28 |
| Ethnicity | "Indian, South Asian" |
| Build | "Athletic lean, 175cm, 72kg" |
| Face | "Angular jawline, short stubble, thick dark eyebrows, brown eyes" |
| Hair | "Black, cropped short on sides, longer on top, matte styled" |
| Outfit | "Charcoal compression tee, black training shorts, white Nike mid-tops" |
| Skin Details | "Medium-brown, slight perspiration sheen" |
| Expression | "Focused, confident, slight half-smile" |
| Accessories | "Black digital watch, wireless earbuds" |
| Reference Photo | Upload for face-consistency anchoring |

**@ Mention System:** Type `@` in Scene Builder fields to insert character/location. Dropdown appears with all saved entries. Selecting inserts the full appearance/environment sheet into the prompt.

### 4.7 Location Library

| Field | Example |
|-------|---------|
| Name | "Urban Rooftop Gym" |
| Type | Indoor / Outdoor / Studio / Mixed |
| Setting | "Modern rooftop gym with floor-to-ceiling windows overlooking Mumbai skyline" |
| Time of Day | Golden hour / Midday / Night / Overcast / Sunrise / Blue hour |
| Lighting | "Warm golden hour backlight, soft fill from overhead LED panels" |
| Surfaces | "Polished concrete floors, exposed brick walls, matte black equipment" |
| Atmosphere | "Slight haze from morning fog, dust motes in light beams" |
| Props | "Dumbbells on rack, yoga mats rolled by wall, water bottles on bench" |
| Color Palette | "Warm greys, matte black, brushed steel, neon orange accents" |
| Soundscape | "Low ambient music, distant traffic, clinking weights" |
| Weather | "Clear sky, gentle breeze" |

### 4.8 Product Composite System

**Multi-Angle Upload:** Front, back, side-left, side-right, top, detail, angle  
**Composite Process:**
- Camera-aware sizing (macro: 35%, wide: 15%, medium: 22% of frame)
- Drop shadow generation (blurred, semi-transparent, offset 4px right + 6px down)
- Text-cue positioning ("left", "right", "center", "hand", "hold", "top", "bottom")
- Transparency-preserving resize with Sharp

### 4.9 Poster Studio

- Scene selection from generated images
- Text overlay: headline, subheading, CTA
- Position control: top, center, bottom
- Size control: small, medium, large
- Export formats: 16:9, 9:16, 1:1, 4:5
- SVG overlay rendering with background filter for readability
- PNG output via Sharp

### 4.10 Performance Hub

**Analytics Dashboard:**
- Per-channel tracking: spend, impressions, clicks, conversions, revenue
- Derived metrics: ROAS (revenue/spend), CPA (spend/conversions)
- Visualizations: Pie chart (channel mix), bar chart (spend vs revenue)
- Period-based entries for trend tracking

**Campaign Manager:**
- Save complete campaign state (product, brand, brief) to Cosmos DB
- Load past campaigns to continue editing
- Delete old campaigns

---

## 5. Data Architecture

### Database: Azure Cosmos DB (Serverless)

| Container | Partition Key | Purpose |
|-----------|--------------|---------|
| campaigns | /brandName | Store saved campaign briefs |
| analytics | /channel | Store performance data |
| characters | /brandName | Store character appearance profiles |
| locations | /brandName | Store location environment profiles |
| users | /email | Store authentication credentials |

**Auto-Creation:** All containers and the database are created automatically on first use via `createIfNotExists`.

### Client State: Zustand Store

| Field | Persistence | Purpose |
|-------|------------|---------|
| productInput | localStorage | Product name, description |
| brandKit | localStorage | Colors, fonts, logo |
| brief | localStorage | Full CreativeBrief |
| assets | localStorage | Generated images, videos, URLs |
| pipeline | Session only | Generation progress tracking |

---

## 6. API Architecture

**21 API routes** across 4 categories:

- **Auth (2):** NextAuth login/signup, config check
- **Strategy (4):** Creative director, campaigns CRUD, URL scraper
- **Generation (6):** Images, video clips, scene-to-image, variants, voiceover, assembly
- **Export (2):** Platform video export, poster export
- **Data (7):** Characters CRUD, locations CRUD, analytics CRUD

---

## 7. Current Limitations & Roadmap

### Known Limitations (v1)
| Limitation | Impact | Planned Resolution |
|------------|--------|-------------------|
| Characters are text-described only (no face training via API) | Visual inconsistency across scenes | Hero Frame Chaining mitigates; Soul ID API access pending |
| Product composite is Sharp overlay, not AI inpainting | Product may look "pasted on" | Higgsfield Product Placement API when available |
| No real-time preview during generation | User waits without feedback | WebSocket progress streaming |
| Single-user sessions only | No team collaboration | Multi-user workspace support |

### Roadmap (v2)
| Feature | Priority | Timeline |
|---------|----------|----------|
| Higgsfield Soul ID API integration (when available) | P0 | Pending API release |
| Higgsfield Cinema Studio API (multi-shot sequencing) | P0 | Pending API release |
| Stripe payment integration | P0 | Next sprint |
| AI budget recommendations engine | P1 | Next sprint |
| Real-time generation progress (WebSocket) | P1 | Next sprint |
| Video template library (pre-built ad formats) | P2 | Future |
| White-label / agency dashboard | P2 | Future |
| Mobile app (React Native) | P3 | Future |

---

*End of Product Requirements Document*
