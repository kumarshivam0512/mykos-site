# MYKOS AI — Business Requirements Document (BRD)

**Document Version:** 1.0  
**Date:** May 5, 2026  
**Prepared By:** Mykos AI Product Team  
**Status:** Active Development  

---

## 1. Executive Summary

Mykos AI is an AI-powered digital marketing automation platform that replaces the need for a creative agency, video production house, and media strategist. It acts as a **virtual Digital Marketing Manager** — taking a product name and description as input and delivering broadcast-ready ad creatives, video campaigns, and platform-specific marketing strategies as output.

The platform addresses a $250B+ global digital advertising market where 78% of small and mid-size businesses cannot afford professional creative agencies, and 65% of marketing teams spend more time on content production than strategy.

---

## 2. Business Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Reduce ad creative production cost | Cost per campaign | 90% reduction vs. agency ($50 vs. $5,000) |
| Reduce time-to-market for ad campaigns | Campaign launch time | From 2-4 weeks to under 2 hours |
| Enable non-designers to produce pro-grade ads | User skill requirement | Zero design or video editing skills needed |
| Achieve character/product consistency across scenes | Visual consistency score | Recognizable identity across all ad scenes |
| Support multi-platform publishing | Platform coverage | YouTube, Instagram, TikTok, LinkedIn, Facebook |

---

## 3. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| D2C Brand Founders | Primary User | Produce ad creatives without hiring agencies |
| Marketing Managers (SMB) | Primary User | Scale campaigns across platforms with limited budget |
| Social Media Managers | Secondary User | Generate platform-specific content consistently |
| Creative Agencies (Small) | Power User | Multiply output capacity by 10x without hiring |
| E-commerce Sellers | Target User | Product ads for Amazon, Shopify, social commerce |
| Investors | Stakeholder | Market opportunity, growth metrics, unit economics |

---

## 4. Business Requirements

### BR-01: End-to-End Campaign Generation
**Need:** A single workflow that takes a product brief and produces a complete ad campaign with strategy, creative assets, and platform-specific deliverables.

**Acceptance Criteria:**
- User inputs product name, description, and optionally a competitor name
- System generates: target audience personas, competitive analysis, platform strategy, creative brief, scene descriptions, voiceover script, and music direction
- All outputs are editable before proceeding to asset generation

### BR-02: AI-Powered Visual Generation
**Need:** Generate photorealistic ad images and cinematic video clips from text descriptions, with controls for mood, lighting, camera angles, and realism level.

**Acceptance Criteria:**
- 6 ad format styles supported (cinematic lifestyle, product showcase, UGC, editorial, sports, animated explainer)
- Ultra-realism controls (film grain, depth of field, atmospheric effects, skin detail, lens imperfections)
- Camera motion control for video (10+ preset moves: push in, orbit, crane, handheld, drone, etc.)
- Per-scene duration control (1-12 seconds per clip)
- Video assembly with crossfade transitions and audio mixing

### BR-03: Brand Consistency
**Need:** Maintain consistent character appearance and product representation across all generated scenes and videos.

**Acceptance Criteria:**
- Character Library with 12+ appearance fields (gender, age, face, hair, outfit, etc.) and reference photo upload
- Location Library with 12+ environment fields (setting, lighting, surfaces, atmosphere, etc.)
- Hero Frame Chaining for video: lock character identity across all video clips using a single source frame
- @ mention system to insert saved characters/locations into scene descriptions
- Multi-angle product image upload (front, back, side, detail) with composite overlay

### BR-04: Multi-Platform Publishing
**Need:** Export campaign assets in every format required by major advertising platforms.

**Acceptance Criteria:**
- Poster export: 16:9 (landscape), 9:16 (portrait), 1:1 (square), 4:5 (Instagram)
- Video export: YouTube (16:9), Instagram Reels (9:16), TikTok (9:16), Feed (1:1)
- Text overlay support for headlines, CTAs, and branding
- Platform-specific briefs with hook, tone, CTA, and duration guidance

### BR-05: Performance Intelligence
**Need:** Track ad performance across channels and provide AI-powered budget optimization.

**Acceptance Criteria:**
- Analytics dashboard with spend, impressions, clicks, conversions, revenue per channel
- ROAS and CPA calculations
- Campaign library for saving/loading past campaigns
- AI-generated budget allocation recommendations (planned)

### BR-06: Authentication & Multi-Tenancy
**Need:** Secure user accounts with campaign data isolation.

**Acceptance Criteria:**
- Email/password authentication
- Per-brand data isolation in database (campaigns, characters, locations scoped to brand)
- Session persistence across page navigations

---

## 5. Functional Requirements

### 5.1 Brand Hub
| ID | Requirement | Priority |
|----|-------------|----------|
| F-01 | AI-generated creative brief from product description | P0 |
| F-02 | Multi-persona audience profiling (3+ personas) | P0 |
| F-03 | Competitor analysis with attack angles | P1 |
| F-04 | Platform-specific strategy briefs | P1 |
| F-05 | PDF export of complete creative brief | P1 |
| F-06 | URL scraping for product metadata extraction | P2 |

### 5.2 Creative Hub
| ID | Requirement | Priority |
|----|-------------|----------|
| F-07 | Multi-scene builder with structured inputs | P0 |
| F-08 | AI image generation (Higgsfield Soul 2.0) | P0 |
| F-09 | AI video generation (Kling 2.1 Pro / Seedance Pro) | P0 |
| F-10 | Video assembly with crossfade transitions & audio | P0 |
| F-11 | Ultra-realism settings (8 toggles, 4 presets) | P1 |
| F-12 | Character Library with reference photo upload | P1 |
| F-13 | Location Library with detailed environment fields | P1 |
| F-14 | @ mention system for characters/locations in scenes | P1 |
| F-15 | Multi-angle product image upload & composite | P1 |
| F-16 | Hero Frame Chaining for character consistency | P1 |
| F-17 | Poster Studio with text overlays & multi-format export | P1 |
| F-18 | Per-scene camera motion and duration control | P1 |
| F-19 | A/B variant script generation per persona | P2 |
| F-20 | Voiceover generation (Text-to-Speech) | P2 |

### 5.3 Performance Hub
| ID | Requirement | Priority |
|----|-------------|----------|
| F-21 | Channel-level analytics tracking | P1 |
| F-22 | Campaign save/load/delete | P1 |
| F-23 | AI budget recommendations | P2 |

---

## 6. Non-Functional Requirements

| ID | Requirement | Specification |
|----|-------------|---------------|
| NF-01 | Image generation latency | < 60 seconds per scene |
| NF-02 | Video clip generation latency | < 5 minutes per clip |
| NF-03 | Video assembly latency | < 2 minutes for 3-scene ad |
| NF-04 | Data persistence | Azure Cosmos DB with auto-container creation |
| NF-05 | Authentication security | JWT sessions, hashed passwords (SHA-256) |
| NF-06 | Browser support | Chrome, Safari, Edge (latest versions) |
| NF-07 | Output resolution | 1080p images, 720p-1080p video |
| NF-08 | Concurrent users | 10+ simultaneous campaigns |

---

## 7. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| State Management | Zustand 5 with localStorage persistence |
| Backend | Next.js API Routes (Node.js) |
| Database | Azure Cosmos DB (Serverless) |
| Image Generation | Higgsfield Soul 2.0 (primary), Pollinations / Replicate / Gemini (fallback) |
| Video Generation | Higgsfield Kling 2.1 Pro / Seedance Pro (primary), Replicate Wan 2.2 (fallback) |
| Video Processing | FFmpeg (crossfade assembly, audio mixing, format conversion) |
| Image Processing | Sharp (resize, composite, poster export) |
| AI Strategy | Google Gemini 2.5 Flash Lite (briefs, personas, recommendations) |
| TTS | Gemini TTS / Edge TTS |
| Authentication | NextAuth v5 (Credentials provider) |
| PDF Export | jsPDF |
| Charts | Recharts |

---

## 8. Constraints & Assumptions

### Constraints
- Higgsfield Soul 2.0 is **text-to-image only** — no image-to-image or face reference via API
- Higgsfield Soul ID (character training) requires 20+ photos and is **web-UI only, not API-accessible**
- Product Placement/Canvas features on Higgsfield are **web-UI only**
- Video clips max 12 seconds per shot via Higgsfield API
- No real-time collaboration (single-user sessions)

### Assumptions
- Users will provide clear product descriptions for AI to generate meaningful briefs
- Higgsfield API rate limits allow at least 10 generations per minute
- Azure Cosmos DB Serverless tier handles expected workload within free/low-cost tier
- Users have modern browsers with JavaScript enabled

---

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI-generated characters inconsistent across scenes | High | High | Hero Frame Chaining; detailed character sheets; consistent seed prompts |
| Product in generated images doesn't match actual product | High | High | Multi-angle upload with Sharp composite; prompt engineering for placement |
| Higgsfield API downtime | Medium | High | Multi-provider fallback chain (5 providers) |
| Generated content doesn't meet brand guidelines | Medium | Medium | Editable briefs; realism presets; brand color injection |
| API costs exceed revenue per user | Medium | High | Gemini free tier for strategy; efficient generation (no redundant calls) |

---

## 10. Success Metrics

| Metric | Baseline | Target (6 months) |
|--------|----------|-------------------|
| Time to first complete ad | N/A (manual: 2-4 weeks) | < 2 hours |
| Cost per campaign for user | $3,000-$10,000 (agency) | < $5 in API costs |
| User retention (monthly) | N/A | > 40% |
| Campaigns generated per user/month | N/A | 5+ |
| Platform exports per campaign | N/A | 3+ formats |

---

*End of Business Requirements Document*
