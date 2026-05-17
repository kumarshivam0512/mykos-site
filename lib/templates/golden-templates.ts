// ─── Golden Ad Templates ─────────────────────────────────────────
// Curated, hand-tuned templates inspired by best-in-class ads across
// (vertical × adType) pairs. Each template encodes proven structure
// (scene beats, camera, lighting, audio direction) that the AI adapts
// to a specific product idea, instead of generating from scratch.
//
// Field values for mood / cameraAngle / lighting / colorGrade MUST match
// the dropdown options in app/creative/page.tsx so the UI populates cleanly.
// Camera move ids MUST match app/creative/video/page.tsx CAMERA_MOVES.
//
// To add a new template:
//   1. Pick a (vertical × adType) pair NOT already covered.
//   2. Reference 2-3 real ads you admire.
//   3. Fill `keywords` with terms the Gemini classifier should match against.
//   4. Sketch 3-4 sceneSlots that follow that ad's actual structure.

import type { QualityTier, AdFormat } from "@/lib/types";

export type AdType =
  | "brand_campaign"          // Aspirational, narrative, emotional — Nike "Just Do It", Bentley "Extraordinary"
  | "product_ad"              // Hero product, often macro — McDonald's, Apple iPhone, Häagen-Dazs pour
  | "testimonial_ugc"         // Real person, handheld, honest — Glossier Real People, Native
  | "launch_announcement"     // Stat-led, dark canvas, B2B clarity — Linear, Vercel
  | "explainer"               // How it works, often animated — Notion, Stripe explainer
  | "promo_sale";             // Bold typography, discount-led — Black Friday, end-of-season

/** Scene slot — AI rewrites the *Hint fields against the user's specific product. */
export interface SceneSlot {
  purpose: "hook" | "value_prop" | "reveal" | "cta" | "transition" | "demo";
  mood: string;                  // must be one of MOODS in scene builder
  cameraAngle: string;           // must be one of CAMERA_ANGLES
  lighting: string;              // must be one of LIGHTING_PRESETS
  colorGrade: string;            // must be one of COLOR_GRADES
  motion: string;                // must be one of CAMERA_MOVES ids
  duration: number;              // seconds per clip
  settingHint: string;           // template fragment — AI fills in product-specific details
  characterActionHint?: string;  // only when needsCharacter
  productPlacementHint: string;
}

export interface CharacterArchetype {
  role: string;
  genderHint: "male" | "female" | "non-binary" | "any";
  ageRange: [number, number];
  expressionHint: string;
  styleNotes: string;
}

export interface LocationArchetype {
  name: string;
  type: "indoor" | "outdoor" | "studio" | "mixed";
  settingHint: string;
  timeOfDay: string;
  lighting: string;
  surfaces: string;
  atmosphere: string;
  colorPalette: string;
}

export interface GoldenTemplate {
  id: string;
  vertical: string;
  adType: AdType;
  formatLabel: string;
  description: string;
  referenceAds: string[];
  keywords: string[];
  adFormat: AdFormat;
  recommendedTier: QualityTier;
  recommendedRealism: "off" | "photo" | "cinematic" | "raw";
  recommendedAspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  needsCharacter: boolean;
  storylineBeats: string[];
  sceneSlots: SceneSlot[];
  locationArchetype: LocationArchetype;
  characterArchetype?: CharacterArchetype;
  voiceoverStyle: string;
  musicStyle: string;
  endCardTagline: string;        // template — AI rewrites with brand voice
  endCardCtaTemplate: string;    // e.g. "Shop {brand}.com"
}

// ─────────────────────────────────────────────────────────────────
// Starter library — 14 templates covering the highest-value combos
// ─────────────────────────────────────────────────────────────────

export const GOLDEN_TEMPLATES: GoldenTemplate[] = [

  // ───────────────────────────────────────────────────────────────
  // 1. LUXURY × Brand Campaign
  // ───────────────────────────────────────────────────────────────
  {
    id: "luxury-brand-cinematic",
    vertical: "Luxury (auto, watches, fragrance, couture)",
    adType: "brand_campaign",
    formatLabel: "Cinematic restraint",
    description: "Slow, confident, premium. Aspirational lifestyle, no shouting. Best for cars, watches, fragrance, high-end fashion.",
    referenceAds: ["Bentley 'Extraordinary Every Day'", "Patek Philippe 'Generations'", "Tom Ford fragrance films"],
    keywords: ["luxury", "premium", "high-end", "car", "watch", "fragrance", "couture", "automotive", "bentley", "rolls-royce", "porsche", "rolex", "patek", "prestige", "heritage", "craftsmanship", "haute"],
    adFormat: "cinematic_lifestyle",
    recommendedTier: "ultra",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "16:9",
    needsCharacter: true,
    storylineBeats: ["Confident pause beside product", "Tactile craftsmanship close-up", "Hero motion shot", "Quiet destination reveal"],
    sceneSlots: [
      { purpose: "hook", mood: "Luxurious", cameraAngle: "Medium shot, three-quarter", lighting: "Golden hour backlight", colorGrade: "Warm cinematic", motion: "push in", duration: 5,
        settingHint: "Sweeping outdoor location at golden hour, wet reflective surface, distant landmark on horizon",
        characterActionHint: "stands beside the product, one hand resting on it, looking off-frame toward the horizon, calm half-smile",
        productPlacementHint: "Three-quarter view, low waist-level, chrome/finish details catching low sun, long shadows across the body" },
      { purpose: "value_prop", mood: "Luxurious", cameraAngle: "Macro detail", lighting: "Warm practical lamps", colorGrade: "Warm desaturated", motion: "push in", duration: 5,
        settingHint: "Interior detail of the product, ambient warm lighting, premium materials in focus",
        characterActionHint: "hand resting on a tactile premium surface — leather, polished metal, hand-polished wood",
        productPlacementHint: "Close-up of a craftsmanship detail — stitching, knurled metal, polished veneer, hand-finished surface" },
      { purpose: "reveal", mood: "Dramatic", cameraAngle: "Profile, side view", lighting: "Golden hour backlight", colorGrade: "Warm cinematic", motion: "dolly right", duration: 5,
        settingHint: "Product in motion through the location, motion-blur background, low sun rim light",
        characterActionHint: "visible inside or interacting with the product, composed and forward-facing",
        productPlacementHint: "Product mid-frame, slight body lean, sunlight flaring through environment" },
      { purpose: "cta", mood: "Calm", cameraAngle: "Wide shot, eye-level", lighting: "Warm practical lamps", colorGrade: "Warm cinematic", motion: "static", duration: 5,
        settingHint: "Final destination — product at rest, one warm practical light glowing, slight blue twilight sky",
        characterActionHint: "walking away from camera toward a doorway, jacket subtly catching the breeze",
        productPlacementHint: "Wide centred composition, product as quiet hero in the foreground" },
    ],
    locationArchetype: {
      name: "Golden Hour Heritage Estate",
      type: "outdoor",
      settingHint: "Winding country road through rolling hills, ancient drystone walls, distant heritage building, wet reflective tarmac",
      timeOfDay: "Golden hour, 30 minutes before sunset",
      lighting: "Warm 3200K sun low on horizon, soft sky bounce, dappled tree-canopy flares",
      surfaces: "Wet reflective road, weathered stone walls, polished metal/leather of product",
      atmosphere: "Light ground mist in low pockets, subtle haze catching low sun",
      colorPalette: "Amber, lavender, mossy green, honey-stone cream",
    },
    characterArchetype: {
      role: "Connoisseur",
      genderHint: "any",
      ageRange: [38, 52],
      expressionHint: "Calm, knowing half-smile, never grinning",
      styleNotes: "Tailored unstructured blazer, cashmere knit, dark indigo denim or wool trousers, suede or polished leather footwear, vintage watch",
    },
    voiceoverStyle: "Low, restrained, aristocratic. Short sentences. Long pauses. UK or neutral English. Almost whispered confidence.",
    musicStyle: "Sparse cinematic piano + sustained cello, 60 BPM, no drums. Reference: Hans Zimmer 'Time' at half intensity, or Max Richter 'On The Nature Of Daylight'.",
    endCardTagline: "Extraordinary, every day.",
    endCardCtaTemplate: "Discover at {brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 2. B2B SaaS × Launch Announcement
  // ───────────────────────────────────────────────────────────────
  {
    id: "saas-launch-dark-canvas",
    vertical: "B2B SaaS / dev tools / fintech",
    adType: "launch_announcement",
    formatLabel: "Dark canvas product spotlight",
    description: "Dark canvas, hero typography, UI as the protagonist. No human on screen. Best for software product launches, B2B tools, developer products.",
    referenceAds: ["Linear 'Build the next generation of software'", "Vercel keynote opens", "Stripe Sessions", "Notion product announcements"],
    keywords: ["saas", "b2b", "software", "platform", "tool", "developer", "api", "infrastructure", "automation", "productivity", "analytics", "workspace", "dashboard", "fintech", "crm", "no-code", "ai tool", "developer tool", "launch"],
    adFormat: "minimalist_editorial",
    recommendedTier: "ultra",
    recommendedRealism: "photo",
    recommendedAspectRatio: "16:9",
    needsCharacter: false,
    storylineBeats: ["Problem stat as hero type", "Solution shown as data delta", "Speed proof", "Distribution flex + CTA"],
    sceneSlots: [
      { purpose: "hook", mood: "Dramatic", cameraAngle: "Wide shot, eye-level", lighting: "Dramatic rim light", colorGrade: "Moody dark", motion: "push in", duration: 5,
        settingHint: "Pitch-black studio canvas, single massive sky-blue percentage or statistic floating as illuminated glass typography (~70% of frame height), small white sub-text below citing the source",
        productPlacementHint: "No product visible yet. Brand wordmark at 30% opacity bottom-left. The stat IS the hook." },
      { purpose: "value_prop", mood: "Aspirational", cameraAngle: "Medium shot, three-quarter", lighting: "Bright and airy", colorGrade: "Cool clinical", motion: "pan right", duration: 5,
        settingHint: "Two floating glass-morphism comparison panels on black canvas — old way (struck-through red) vs new way (bright sky-blue) — connected by thin glowing lines, with a large action-green delta badge between",
        productPlacementHint: "The comparison panel IS the product story. Brand logo top-left of the right panel. One-line proof underneath." },
      { purpose: "reveal", mood: "Energetic", cameraAngle: "Wide shot, eye-level", lighting: "Bright and airy", colorGrade: "Vibrant saturated", motion: "pan right", duration: 5,
        settingHint: "Horizontal timeline visualisation on black canvas — long greyed-out 'old' bar vs short bright sky-blue 'new' bar, with green check at the end",
        productPlacementHint: "Subtle product UI mockup at top-right corner showing a 100% progress bar. Large green type below the timelines naming the speed win." },
      { purpose: "cta", mood: "Luxurious", cameraAngle: "Wide shot, eye-level", lighting: "Bright and airy", colorGrade: "Vibrant saturated", motion: "dolly out", duration: 5,
        settingHint: "Five floating platform export frames in a curved arc on black canvas, each connected by thin sky-blue glow lines to a central brand logo node",
        productPlacementHint: "Platform labels under each frame. Footer text with measurable proof. Tagline + CTA + URL centred." },
    ],
    locationArchetype: {
      name: "B2B Dark Canvas Studio",
      type: "studio",
      settingHint: "Pure pitch-black studio backdrop, infinite depth, no horizon. Only objects in space are floating UI panels, glass cards, and oversized typography rendered as backlit holograms",
      timeOfDay: "N/A — abstract studio",
      lighting: "Single soft sky-blue volumetric key from above-front illuminating only the UI surfaces; subtle magenta rim from far back-left for depth; everything else jet black with thin lens flare on bright UI edges",
      surfaces: "Polished obsidian floor with 5% UI reflection, glass-morphism cards with 1px sky-blue borders and 60% blur, SF Pro / Inter crisp white typography",
      atmosphere: "Tiny dust particles drifting through volumetric light beams, faint atmospheric haze, thin sky-blue grid line on floor receding to infinity",
      colorPalette: "Pure black (#0A0A0A), sky-blue (#0EA5E9), action green (#10B981), pure white (#F5F5F5), 5% magenta accent",
    },
    voiceoverStyle: "Neutral, confident, restrained. Stripe Press / Notion narrator. Precise-credible, not warm-emotional. Slight UK or neutral Indian English.",
    musicStyle: "Sparse modern electronic. Sub-bass drone + tick metronome → resonant synth stabs on data points → soft 4-on-floor pulse → rising arpeggio resolving on tagline. No drums until midway. No vocal samples ever. Reference: Notion launch, Linear anthem, Tycho × Bonobo at 50% intensity.",
    endCardTagline: "Stop {painPoint}. Start {desiredState}.",
    endCardCtaTemplate: "Start free at {brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 3. B2B SaaS × Explainer
  // ───────────────────────────────────────────────────────────────
  {
    id: "saas-explainer-flat-motion",
    vertical: "B2B SaaS / no-code / API",
    adType: "explainer",
    formatLabel: "Flat-design motion explainer",
    description: "How it works in 3 steps. Flat illustration style, motion graphics, clear typography. Best for explaining SaaS workflows, APIs, no-code tools.",
    referenceAds: ["Stripe explainer films", "Notion onboarding videos", "Webflow product tours"],
    keywords: ["explainer", "how it works", "tutorial", "onboarding", "workflow", "integration", "api", "no-code", "automation", "saas", "stripe", "notion", "step-by-step"],
    adFormat: "animated_explainer",
    recommendedTier: "premium",
    recommendedRealism: "off",
    recommendedAspectRatio: "16:9",
    needsCharacter: false,
    storylineBeats: ["Problem framed in flat illustration", "Step 1 — input", "Step 2 — magic", "Step 3 — output / CTA"],
    sceneSlots: [
      { purpose: "hook", mood: "Professional", cameraAngle: "Wide shot, eye-level", lighting: "Bright and airy", colorGrade: "Bright pastel", motion: "static", duration: 4,
        settingHint: "Flat 2D illustration of a person at a cluttered desk, exaggerated style, brand colour accents on key objects, white background",
        productPlacementHint: "Brand wordmark top-left. Speech bubble or thought cloud showing the user's frustration as a single icon (broken cog, hourglass, etc.)" },
      { purpose: "demo", mood: "Professional", cameraAngle: "Wide shot, eye-level", lighting: "Bright and airy", colorGrade: "Bright pastel", motion: "static", duration: 4,
        settingHint: "Step 1 — flat illustration of the user dropping their input into a stylised brand-coloured funnel (upload, connect data source, paste link)",
        productPlacementHint: "Large step number '1' top-left, single action label below ('Upload', 'Connect', 'Type'). Brand colour saturated on the input object." },
      { purpose: "demo", mood: "Energetic", cameraAngle: "Wide shot, eye-level", lighting: "Bright and airy", colorGrade: "Bright pastel", motion: "orbit", duration: 4,
        settingHint: "Step 2 — flat illustration of the product processing the input — gears turning, particles flowing, brand-colour gradient pulse in centre",
        productPlacementHint: "Large step number '2'. Brand mascot/logo at centre with motion lines radiating outward. Single label ('AI runs', 'We process', 'Magic happens')." },
      { purpose: "cta", mood: "Aspirational", cameraAngle: "Wide shot, eye-level", lighting: "Bright and airy", colorGrade: "Bright pastel", motion: "push in", duration: 4,
        settingHint: "Step 3 — flat illustration of the user now relaxed, holding the polished output, big smile, confetti accents in brand colour",
        productPlacementHint: "Large step number '3'. Output object highlighted. Brand wordmark + CTA button bottom-centre, single short line above." },
    ],
    locationArchetype: {
      name: "Flat Illustration Workspace",
      type: "studio",
      settingHint: "Clean white or pastel background, exaggerated flat 2D illustration style, brand colour palette dominant, geometric shapes",
      timeOfDay: "N/A — flat illustration",
      lighting: "N/A — flat shading, simple drop shadows in brand-coloured tint",
      surfaces: "Flat colour fills, subtle pattern textures, geometric outlines",
      atmosphere: "Friendly, modern, slightly playful, professional",
      colorPalette: "Brand primary + 2 brand accents on cream or white background",
    },
    voiceoverStyle: "Warm, slightly upbeat, clear. Conversational professional. 'Here's how it works' opener. Female voice often better for explainers.",
    musicStyle: "Upbeat indie-pop or playful ukulele/marimba, 100 BPM, no drums until step 2, single 'ding' chime on each step transition. Reference: Slack onboarding videos, Mailchimp explainers.",
    endCardTagline: "{benefit} in three steps.",
    endCardCtaTemplate: "Try it free at {brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 4. SPORTSWEAR × Brand Campaign
  // ───────────────────────────────────────────────────────────────
  {
    id: "sportswear-brand-narrative",
    vertical: "Sportswear (athletic apparel, performance shoes)",
    adType: "brand_campaign",
    formatLabel: "Athlete narrative",
    description: "Heroic athlete arc — preparation, struggle, triumph. Cinematic, rim-lit, motivational. Best for sportswear brand campaigns.",
    referenceAds: ["Nike 'Just Do It' anthems", "Under Armour 'Will Finds A Way'", "Adidas 'Impossible Is Nothing'"],
    keywords: ["sportswear", "athletic", "sport", "performance", "nike", "adidas", "under armour", "puma", "running", "training", "athlete", "brand campaign", "anthem"],
    adFormat: "energetic_sports",
    recommendedTier: "premium",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "16:9",
    needsCharacter: true,
    storylineBeats: ["Pre-dawn preparation", "Struggle under load", "Breakthrough moment", "Triumphant horizon"],
    sceneSlots: [
      { purpose: "hook", mood: "Gritty", cameraAngle: "Close-up, eye-level", lighting: "Dramatic rim light", colorGrade: "Desaturated matte", motion: "static", duration: 5,
        settingHint: "Pre-dawn outdoor or industrial gym, exposed brick or concrete, single cool window light, breath visible",
        characterActionHint: "tying laces or chalking hands, focused jaw set, shallow breath visible in cool air",
        productPlacementHint: "Brand apparel/footwear visible on body but not centred — the determination IS the hero" },
      { purpose: "value_prop", mood: "Energetic", cameraAngle: "Low angle, heroic", lighting: "Dramatic rim light", colorGrade: "Orange-teal", motion: "handheld", duration: 5,
        settingHint: "Mid-effort moment — sprint stride, pull-up, lift — sweat catching the rim light, motion blur on limbs",
        characterActionHint: "mid-rep at maximum exertion, veins visible, exhale through clenched teeth",
        productPlacementHint: "Brand silhouette/swoosh visible on apparel or shoe with motion blur — recognised not advertised" },
      { purpose: "reveal", mood: "Aspirational", cameraAngle: "Close-up, eye-level", lighting: "Natural window light", colorGrade: "Vibrant saturated", motion: "push in", duration: 5,
        settingHint: "Post-set moment — water dripping, sun starting to break through clouds, breakthrough on the face",
        characterActionHint: "head lifts, eyes open with new resolve, single bead of sweat tracks down cheek",
        productPlacementHint: "Brand mark on apparel/footwear catches the new light — earned, not displayed" },
      { purpose: "cta", mood: "Energetic", cameraAngle: "Wide shot, eye-level", lighting: "Golden hour backlight", colorGrade: "Vibrant saturated", motion: "crane up", duration: 5,
        settingHint: "Open environment — empty stadium, rooftop, mountain ridge — sunrise breaking",
        characterActionHint: "arms outstretched or sprinting forward into the light, victorious silhouette",
        productPlacementHint: "Brand logo + tagline overlay on the final frame, no physical product needed in scene" },
    ],
    locationArchetype: {
      name: "Industrial Performance Gym at Dawn",
      type: "indoor",
      settingHint: "Modern industrial gym, exposed brick walls, rubber flooring, chrome free-weight racks, floor-to-ceiling east-facing windows",
      timeOfDay: "Pre-dawn into early morning, 5:30 to 6:30 AM",
      lighting: "Cool 5500K early morning light from east windows, LED strip lights at 4000K along ceiling edges, dramatic side rim light",
      surfaces: "Black rubber floor, raw concrete walls, chrome equipment, matte black benches",
      atmosphere: "Visible breath in cool air, dust particles in window light beams, faint sweat sheen",
      colorPalette: "Cool concrete grey, matte black, chrome silver, single accent of brand colour",
    },
    characterArchetype: {
      role: "Athlete",
      genderHint: "any",
      ageRange: [22, 32],
      expressionHint: "Focused intensity, jaw set, eyes locked forward",
      styleNotes: "Fitted compression top showing musculature, athletic shorts, performance footwear in brand colour, simple wrist sweatband",
    },
    voiceoverStyle: "Low, growled, almost whispered. Short hard sentences. Drops in early, lets the kinetics carry. Or no VO — sound design only.",
    musicStyle: "Electronic trap / cinematic hybrid, 120-140 BPM, hard 808 sub kicks, single rising synth that crescendos on the breakthrough. Reference: Apashe, ODESZA build, Bonobo 'Cirrus'.",
    endCardTagline: "Earn it.",
    endCardCtaTemplate: "{brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 5. SPORTSWEAR × Product Ad (shoe, hoodie, etc.)
  // ───────────────────────────────────────────────────────────────
  {
    id: "sportswear-product-spotlight",
    vertical: "Sportswear (shoes, apparel, accessories)",
    adType: "product_ad",
    formatLabel: "Performance product spotlight",
    description: "Product macro detail + on-body demo + 360 reveal. Hero the product itself. Best for sneaker drops, hoodie launches, gear reveals.",
    referenceAds: ["Nike Air Max product films", "Adidas Boost macro reveals", "On Running shoe films"],
    keywords: ["sneaker", "shoe", "hoodie", "jersey", "jacket", "leggings", "sportswear product", "drop", "release", "limited edition", "footwear", "athletic apparel"],
    adFormat: "product_showcase",
    recommendedTier: "ultra",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "9:16",
    needsCharacter: true,
    storylineBeats: ["Product macro detail (texture, sole, fabric)", "Product in use on body", "360 hero turn", "Drop date / CTA"],
    sceneSlots: [
      { purpose: "hook", mood: "Dramatic", cameraAngle: "Macro detail", lighting: "Dramatic rim light", colorGrade: "Orange-teal", motion: "orbit", duration: 5,
        settingHint: "Black or deep brand-coloured studio backdrop, single hard rim light, hyper-detailed close-up of a product feature (sole pattern, fabric weave, stitching, badge)",
        productPlacementHint: "Single feature fills 70% of frame, brand colour saturated, surrounding product softly out of focus" },
      { purpose: "demo", mood: "Energetic", cameraAngle: "Low angle, heroic", lighting: "Natural window light", colorGrade: "Vibrant saturated", motion: "handheld", duration: 5,
        settingHint: "Real-world action environment matching the product use (urban street, track, gym floor, outdoor trail)",
        characterActionHint: "mid-action in the product — running stride, pivot, push-off, mid-sweat — product clearly visible",
        productPlacementHint: "Product on body in real motion, ground/floor contact visible, brand mark catches light at apex of motion" },
      { purpose: "reveal", mood: "Aspirational", cameraAngle: "Profile, side view", lighting: "Studio softbox, key + fill", colorGrade: "Vibrant saturated", motion: "orbit", duration: 5,
        settingHint: "Clean studio turntable, product slowly rotating, soft top key and bottom kick light, brand colour gradient backdrop",
        productPlacementHint: "Full product centred, slow 360 turn, all angles visible, brand mark prominent at the 50% rotation mark" },
      { purpose: "cta", mood: "Energetic", cameraAngle: "Wide shot, eye-level", lighting: "Dramatic rim light", colorGrade: "Vibrant saturated", motion: "static", duration: 5,
        settingHint: "Product centred against bold brand-coloured background, drop date and price in large typography",
        productPlacementHint: "Product floating slightly above centre, large date/price typography, CTA button, brand logo bottom-centre" },
    ],
    locationArchetype: {
      name: "Brand-Studio Black + Real Action Mix",
      type: "mixed",
      settingHint: "Studio shots: matte black backdrop with hard side light. Action shots: real urban or athletic environment matching the product use case",
      timeOfDay: "Studio: controlled. Action: golden hour or harsh midday for high contrast",
      lighting: "Studio: single hard rim + soft fill. Action: natural with rim emphasis",
      surfaces: "Matte black studio sweep, real surfaces (asphalt, track, rubber floor) for action",
      atmosphere: "Studio: clean isolation. Action: kinetic, motion blur, sweat",
      colorPalette: "Matte black, brand primary saturated, accent white",
    },
    characterArchetype: {
      role: "Athlete model",
      genderHint: "any",
      ageRange: [20, 30],
      expressionHint: "Focused performance, not modelly smiles",
      styleNotes: "Matching brand kit head-to-toe, hair functional (tied back / cropped), no jewellery visible",
    },
    voiceoverStyle: "Short, declarative. 5-8 word lines. Almost product-spec terse. 'Built for the breakaway.' 'Earn the angle.'",
    musicStyle: "Electronic with hard percussion, 110-125 BPM, build to a single drop on the 360 reveal. Reference: Disclosure, Flume, ODESZA.",
    endCardTagline: "Available now.",
    endCardCtaTemplate: "{brand}.com — drops {date}",
  },

  // ───────────────────────────────────────────────────────────────
  // 6. FASHION × Brand Campaign (lookbook-style)
  // ───────────────────────────────────────────────────────────────
  {
    id: "fashion-brand-lookbook",
    vertical: "Fashion (premium, contemporary, streetwear)",
    adType: "brand_campaign",
    formatLabel: "Editorial lookbook",
    description: "Slow, considered, fashion-film. Strong silhouettes, restrained motion, single hero piece per scene. Best for fashion brand campaigns, designer drops.",
    referenceAds: ["The Row campaigns", "Jacquemus seasonal films", "Acne Studios lookbooks", "Issey Miyake films"],
    keywords: ["fashion", "apparel", "clothing", "lookbook", "designer", "streetwear", "couture", "ready-to-wear", "drop", "collection", "season", "editorial"],
    adFormat: "minimalist_editorial",
    recommendedTier: "ultra",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "4:5",
    needsCharacter: true,
    storylineBeats: ["Silhouette establish", "Fabric and detail", "Movement", "Brand mark + drop info"],
    sceneSlots: [
      { purpose: "hook", mood: "Minimal", cameraAngle: "Wide shot, eye-level", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "static", duration: 5,
        settingHint: "Brutalist concrete interior or minimalist gallery, single window, neutral palette, geometric architecture",
        characterActionHint: "stands centre-frame in the hero piece, body angled slightly, hands resting naturally, neutral direct gaze",
        productPlacementHint: "Garment in full silhouette against architecture, single defining design element catches eye" },
      { purpose: "value_prop", mood: "Calm", cameraAngle: "Macro detail", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "push in", duration: 5,
        settingHint: "Same architectural setting, slow push toward a fabric/construction detail — pleat, seam, button, hardware",
        characterActionHint: "hand resting on the detail, slow micro-movement of fabric",
        productPlacementHint: "Macro of a construction detail filling 60% of frame, weave/texture visible, soft hand at edge of frame" },
      { purpose: "reveal", mood: "Aspirational", cameraAngle: "Profile, side view", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "pan right", duration: 5,
        settingHint: "Same architectural setting, model walking slowly toward window, garment in motion",
        characterActionHint: "walks slowly across frame, garment catches light/wind, head turns slightly at midpoint",
        productPlacementHint: "Full silhouette in motion, fabric drape and movement visible, light shifts on the garment" },
      { purpose: "cta", mood: "Minimal", cameraAngle: "Wide shot, eye-level", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "static", duration: 5,
        settingHint: "Wide static composition of the architectural space with the model small in frame, brand wordmark in elegant serif on the wall or overlay",
        productPlacementHint: "Brand wordmark dominant, season/collection name and date in small type, model and garment as quiet anchor" },
    ],
    locationArchetype: {
      name: "Brutalist Gallery",
      type: "indoor",
      settingHint: "Bare concrete walls, polished concrete floor, single large industrial window, no furniture except one minimalist bench, daylight only",
      timeOfDay: "Late morning to early afternoon for strong directional daylight",
      lighting: "Strong 5500K directional north or east window light, sharp shadow play on concrete, soft fill from opposite wall bounce",
      surfaces: "Raw grey concrete, polished concrete floor with subtle texture, garment fabric as the only soft element",
      atmosphere: "Quiet, still, considered, slight dust in light beams",
      colorPalette: "Concrete grey, warm cream from window light, garment colour as single accent",
    },
    characterArchetype: {
      role: "Model",
      genderHint: "any",
      ageRange: [22, 35],
      expressionHint: "Neutral self-possession, no smile, soft direct gaze",
      styleNotes: "Hair pulled back simply or natural, no visible makeup or very minimal, no jewellery (let the garment speak), bare feet or simple shoes",
    },
    voiceoverStyle: "Often no VO. If used: single short poetic line per scene, whispered, intimate, in the brand's voice. Designer's name or season name only.",
    musicStyle: "Ambient with single sustained piano notes, 50-60 BPM, very sparse. Reference: Nils Frahm 'Says', Olafur Arnalds, Max Richter ambient cuts.",
    endCardTagline: "{Collection name} · {Season} {Year}",
    endCardCtaTemplate: "{brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 7. FASHION × Product Ad (single piece, hoodie/dress/jacket)
  // ───────────────────────────────────────────────────────────────
  {
    id: "fashion-product-feature",
    vertical: "Fashion (single product — hoodie, jacket, dress, bag)",
    adType: "product_ad",
    formatLabel: "Single-piece feature",
    description: "One garment, multiple angles, fabric and fit story. Best for individual product launches — hoodie drops, signature bags, hero pieces.",
    referenceAds: ["Carhartt WIP product films", "Aimé Leon Dore signature pieces", "Bottega Veneta bag films"],
    keywords: ["hoodie", "jacket", "dress", "bag", "shirt", "tee", "pants", "sweater", "single piece", "signature", "hero product", "fabric"],
    adFormat: "product_showcase",
    recommendedTier: "ultra",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "4:5",
    needsCharacter: true,
    storylineBeats: ["Fabric/construction macro", "On-body fit", "Lifestyle moment", "Price and CTA"],
    sceneSlots: [
      { purpose: "hook", mood: "Calm", cameraAngle: "Macro detail", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "push in", duration: 5,
        settingHint: "Soft natural light on the garment laid on a wooden or linen surface, fabric texture in extreme close-up",
        productPlacementHint: "Macro of fabric weave/stitch/hardware filling frame, soft shadow showing weight and drape" },
      { purpose: "demo", mood: "Aspirational", cameraAngle: "Medium shot, three-quarter", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "static", duration: 5,
        settingHint: "Model in the garment in a relaxed contemporary interior — concrete floor, plant, single chair",
        characterActionHint: "stands or sits naturally in the garment, hand adjusting collar or sleeve, calm direct gaze",
        productPlacementHint: "Full garment visible on body, fit and drape clear, neutral environment, single brand label visible" },
      { purpose: "reveal", mood: "Warm", cameraAngle: "Wide shot, eye-level", lighting: "Golden hour backlight", colorGrade: "Warm cinematic", motion: "handheld", duration: 5,
        settingHint: "Real outdoor lifestyle moment — coffee on a sidewalk, park bench, urban street at golden hour",
        characterActionHint: "in motion with the garment — walking, sitting down, reaching for something — the garment moves with the body",
        productPlacementHint: "Garment in natural motion, contextual setting that suggests the garment's intended use" },
      { purpose: "cta", mood: "Minimal", cameraAngle: "Wide shot, eye-level", lighting: "Studio softbox, key + fill", colorGrade: "Warm desaturated", motion: "static", duration: 4,
        settingHint: "Clean studio shot of the garment on a hanger or flat-laid, brand wordmark and price in clean type",
        productPlacementHint: "Garment centred, name and price below in small clean type, CTA URL bottom-centre" },
    ],
    locationArchetype: {
      name: "Contemporary Interior + Real Outdoor",
      type: "mixed",
      settingHint: "Studio + interior shots in a minimal concrete-and-wood loft. Lifestyle shot in real urban or natural environment.",
      timeOfDay: "Studio: any. Lifestyle: golden hour for warmth.",
      lighting: "Studio: soft daylight equivalent. Lifestyle: warm backlit golden hour.",
      surfaces: "Wood floor, concrete wall, linen cushion in studio; real-world surfaces outdoor",
      atmosphere: "Calm considered indoor, warm and lived-in outdoor",
      colorPalette: "Warm neutrals: cream, oat, terracotta, oak, with the garment colour as accent",
    },
    characterArchetype: {
      role: "Real-feeling model",
      genderHint: "any",
      ageRange: [24, 38],
      expressionHint: "Relaxed, natural, slight half-smile, not posed",
      styleNotes: "Hair natural, minimal makeup, layered with simple basics underneath, watch or thin chain at most",
    },
    voiceoverStyle: "Optional. If used: warm, intimate, one short line per scene describing fabric, fit, or the moment.",
    musicStyle: "Warm indie folk or acoustic, 70-85 BPM, fingerpicked guitar or solo piano, very lightly textured. Reference: José González, Bon Iver acoustic cuts.",
    endCardTagline: "{Product name} · {Material/Detail}",
    endCardCtaTemplate: "{brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 8. FOOD × Product Ad (macro pour / hero food)
  // ───────────────────────────────────────────────────────────────
  {
    id: "food-product-appetite",
    vertical: "Food, beverage, restaurant",
    adType: "product_ad",
    formatLabel: "Appetite-forward macro",
    description: "Hyper-close macro, steam, condensation, slow pour. Triggers craving in 3 seconds. Best for packaged food, coffee, spirits, snacks, restaurant menu items.",
    referenceAds: ["Diet Coke pour shots", "McDonald's hero-food macros", "Häagen-Dazs slow-pull", "Starbucks pumpkin spice"],
    keywords: ["food", "beverage", "restaurant", "coffee", "tea", "drink", "snack", "chocolate", "ice cream", "burger", "pizza", "spirits", "wine", "whiskey", "cafe", "dining", "menu"],
    adFormat: "product_showcase",
    recommendedTier: "ultra",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "1:1",
    needsCharacter: false,
    storylineBeats: ["Sensory hook (steam/pour)", "Ingredient detail", "Hero product centred", "Brand mark + tagline"],
    sceneSlots: [
      { purpose: "hook", mood: "Warm", cameraAngle: "Macro detail", lighting: "Warm practical lamps", colorGrade: "Warm cinematic", motion: "push in", duration: 4,
        settingHint: "Hyper close-up of the product mid-action — steam rising from a cup, liquid being poured, butter melting, condensation forming",
        productPlacementHint: "Product fills the frame, single warm practical from upper-left, dark wood or marble surface" },
      { purpose: "value_prop", mood: "Warm", cameraAngle: "Macro detail", lighting: "Warm practical lamps", colorGrade: "Warm cinematic", motion: "orbit", duration: 4,
        settingHint: "Slow orbit around an ingredient detail — single coffee bean, chocolate flake, sesame seed on a bun",
        productPlacementHint: "Ingredient takes 60% of frame, soft beautiful out-of-focus product behind, raking warm light" },
      { purpose: "reveal", mood: "Luxurious", cameraAngle: "Medium shot, three-quarter", lighting: "Warm practical lamps", colorGrade: "Warm cinematic", motion: "push in", duration: 4,
        settingHint: "Hero product on a styled surface — wood grain, linen napkin, single fresh herb sprig — soft warm light, deep negative space",
        productPlacementHint: "Product centred and slightly low in frame, label perfectly forward-facing, brand colour pops against neutral background" },
      { purpose: "cta", mood: "Warm", cameraAngle: "Wide shot, eye-level", lighting: "Warm practical lamps", colorGrade: "Warm cinematic", motion: "static", duration: 3,
        settingHint: "Same hero product setup but with brand logo and tagline elegantly overlaid",
        productPlacementHint: "Product slightly off-centre to make room for typography, logo top or bottom in brand colour, single line tagline" },
    ],
    locationArchetype: {
      name: "Warm Marble Counter Studio",
      type: "studio",
      settingHint: "Dark walnut wood or honed black marble counter, deep matte black background falling into shadow, single linen napkin or wooden serving board",
      timeOfDay: "Implied warm afternoon — no window, controlled lighting",
      lighting: "Single soft warm 2800K practical from upper-left at 45° creating raking light across product texture, soft 20% bounce from camera-right",
      surfaces: "Polished marble or seasoned wood grain, fabric napkin, condensation on glass, steam on hot drinks",
      atmosphere: "Visible steam wisps, condensation droplets, slow liquid motion blur on pours",
      colorPalette: "Deep walnut, honey amber, cream linen, pop of brand colour from product label",
    },
    voiceoverStyle: "Optional — appetite ads often work without VO. If used: warm intimate low, one short evocative line per beat. Female voice often works for food.",
    musicStyle: "Warm acoustic — solo piano or fingerpicked guitar, 70 BPM, single bell tone on the product reveal. Or modern minimal electronic with analog warmth. Reference: Yann Tiersen, Nils Frahm, FKJ.",
    endCardTagline: "Made for the moment.",
    endCardCtaTemplate: "Order at {brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 9. BEAUTY × Brand Campaign
  // ───────────────────────────────────────────────────────────────
  {
    id: "beauty-brand-editorial",
    vertical: "Beauty, skincare, fragrance, jewellery",
    adType: "brand_campaign",
    formatLabel: "Soft editorial",
    description: "Diffused light, slow motion, skin texture, intimate framing. Editorial fashion-photography feel. Best for skincare, cosmetics, fragrance, jewellery brand campaigns.",
    referenceAds: ["Glossier 'Skin First'", "Aesop product films", "Chanel No.5 'There you are'", "Cartier Trinity"],
    keywords: ["beauty", "skincare", "cosmetics", "fragrance", "perfume", "jewellery", "makeup", "serum", "cream", "lipstick", "spa", "wellness", "self-care"],
    adFormat: "minimalist_editorial",
    recommendedTier: "ultra",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "4:5",
    needsCharacter: true,
    storylineBeats: ["Soft portrait moment", "Product ritual close-up", "Result/glow shot", "Quiet brand reveal"],
    sceneSlots: [
      { purpose: "hook", mood: "Calm", cameraAngle: "Close-up, eye-level", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "push in", duration: 5,
        settingHint: "Soft north-facing window light, neutral linen backdrop, pale morning",
        characterActionHint: "head tilted softly, eyes closed for a beat, hand resting near collarbone, breath of stillness",
        productPlacementHint: "Product not yet visible — pure portrait establishing skin and texture" },
      { purpose: "value_prop", mood: "Calm", cameraAngle: "Macro detail", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "push in", duration: 5,
        settingHint: "Macro of the product being applied — droplet on fingertip, fragrance mist, cream texture, jewellery being clasped",
        characterActionHint: "fingertip with droplet of product approaching skin, slow deliberate motion",
        productPlacementHint: "Product detail fills 50% of frame, soft hand and skin in soft focus around it" },
      { purpose: "reveal", mood: "Aspirational", cameraAngle: "Close-up, eye-level", lighting: "Natural window light", colorGrade: "Warm cinematic", motion: "static", duration: 5,
        settingHint: "Same portrait setting but transformed — gentle glow on skin, subtle smile, quiet confidence",
        characterActionHint: "eyes now open, soft direct gaze to camera, almost-smile, calm transformation",
        productPlacementHint: "Product visible at edge of frame on a flat surface, label readable, no overt advertising" },
      { purpose: "cta", mood: "Minimal", cameraAngle: "Macro detail", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "static", duration: 3,
        settingHint: "Product alone on linen with brand wordmark in serif and a single short line",
        productPlacementHint: "Centred minimalist product shot, generous negative space, brand wordmark and CTA in elegant serif" },
    ],
    locationArchetype: {
      name: "North Window Editorial Studio",
      type: "indoor",
      settingHint: "Plaster wall in warm off-white, large north-facing window with sheer linen curtain, single wooden side table with linen napkin",
      timeOfDay: "Late morning, soft overcast or diffused light",
      lighting: "Soft 5000K diffused north window light, no direct sun, gentle fall-off, single bounce card camera-right for fill",
      surfaces: "Bare skin texture, raw linen, warm plaster wall, honed marble or natural wood",
      atmosphere: "Stillness, slow dust motes in window light, faint warmth",
      colorPalette: "Warm off-white, blush pink, soft amber, honey skin tones, single accent of brand colour",
    },
    characterArchetype: {
      role: "Subject",
      genderHint: "any",
      ageRange: [25, 45],
      expressionHint: "Calm self-possession, no performed smile, soft gaze",
      styleNotes: "Bare shoulders or simple cream/cashmere top, hair loose and natural, no visible makeup or very minimal, no jewellery except the product",
    },
    voiceoverStyle: "Whispered, intimate, almost spoken thought. One short poetic line per beat. Female voice typical for beauty.",
    musicStyle: "Solo piano or harp, 50-60 BPM, sustained string pad underneath, almost ambient. Single bell or chime on the reveal. Reference: Olafur Arnalds, Ludovico Einaudi, Erik Satie.",
    endCardTagline: "{Quality}, redefined.",
    endCardCtaTemplate: "Discover at {brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 10. BEAUTY × Product Ad (single SKU)
  // ───────────────────────────────────────────────────────────────
  {
    id: "beauty-product-ritual",
    vertical: "Beauty, skincare (single SKU)",
    adType: "product_ad",
    formatLabel: "Product ritual",
    description: "Show the product, the ritual of using it, the result. Single SKU focus. Best for skincare hero product, fragrance launch, cosmetic single shade.",
    referenceAds: ["The Ordinary product films", "Drunk Elephant ritual content", "Le Labo unboxing films"],
    keywords: ["serum", "cream", "moisturiser", "cleanser", "mask", "fragrance bottle", "lipstick", "single product", "sku", "hero product"],
    adFormat: "product_showcase",
    recommendedTier: "ultra",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "9:16",
    needsCharacter: true,
    storylineBeats: ["Product macro hero", "Dispense/application close-up", "On-skin result", "Brand + price"],
    sceneSlots: [
      { purpose: "hook", mood: "Minimal", cameraAngle: "Macro detail", lighting: "Studio softbox, key + fill", colorGrade: "Cool clinical", motion: "orbit", duration: 4,
        settingHint: "Pristine product on a stone or glass surface, soft top key light, neutral grey backdrop, slow rotation",
        productPlacementHint: "Product alone in frame, label fully forward, brand colour clean and saturated, no hands or skin visible" },
      { purpose: "demo", mood: "Calm", cameraAngle: "Macro detail", lighting: "Natural window light", colorGrade: "Warm desaturated", motion: "push in", duration: 4,
        settingHint: "Product being dispensed onto fingertip, hand, or applicator, slow controlled motion",
        characterActionHint: "fingertip catches a drop of product, slow approach toward face/skin",
        productPlacementHint: "Dispensing moment fills frame, texture of product clear, brand element visible at edge" },
      { purpose: "reveal", mood: "Aspirational", cameraAngle: "Close-up, eye-level", lighting: "Natural window light", colorGrade: "Warm cinematic", motion: "static", duration: 4,
        settingHint: "Skin close-up after application — glow, dewiness, even tone — soft natural light",
        characterActionHint: "skin in close-up, almost-smile, eyes calm and confident",
        productPlacementHint: "Product not in frame this beat — the result IS the proof" },
      { purpose: "cta", mood: "Minimal", cameraAngle: "Wide shot, eye-level", lighting: "Studio softbox, key + fill", colorGrade: "Cool clinical", motion: "static", duration: 3,
        settingHint: "Same studio shot of the product with name, key ingredient/benefit, and price in clean type",
        productPlacementHint: "Product centred, product name in serif above, single benefit line below, price and CTA at bottom" },
    ],
    locationArchetype: {
      name: "Clinical-Soft Studio",
      type: "studio",
      settingHint: "Neutral pale grey or cream backdrop, polished honed surface (stone, glass, marble), single tonal prop",
      timeOfDay: "Implied morning, controlled studio",
      lighting: "Soft 5000K top key with diffusion + reflector fill, clean shadow control",
      surfaces: "Stone, honed marble, glass, bare skin texture",
      atmosphere: "Clinical with warmth, pristine, considered",
      colorPalette: "Pale neutrals with brand accent from product",
    },
    characterArchetype: {
      role: "Skin/hand model",
      genderHint: "any",
      ageRange: [22, 45],
      expressionHint: "Calm, almost meditative",
      styleNotes: "Bare skin focus, neutral nail colour or none, hair pulled back simply",
    },
    voiceoverStyle: "Calm, precise, ingredient-led. One ingredient or benefit per beat. 'Hyaluronic acid. 1.2% niacinamide. Zero fragrance.'",
    musicStyle: "Minimal ambient electronic, 60 BPM, single sustained note throughout, occasional subtle chime. Reference: Brian Eno ambient, Nils Frahm 'Trance Frendz' cuts.",
    endCardTagline: "{Hero ingredient}. {Hero benefit}.",
    endCardCtaTemplate: "{brand}.com — ${price}",
  },

  // ───────────────────────────────────────────────────────────────
  // 11. D2C × Testimonial UGC
  // ───────────────────────────────────────────────────────────────
  {
    id: "d2c-testimonial-ugc",
    vertical: "D2C consumer (DTC fashion, home, baby, pet, supplement)",
    adType: "testimonial_ugc",
    formatLabel: "UGC testimonial",
    description: "Phone-shot energy, real-person honesty, handheld feel. Trust over polish. Best for consumer brands building credibility.",
    referenceAds: ["Native Deodorant founder ads", "Glossier Real People", "Rocket Money creator UGC"],
    keywords: ["d2c", "dtc", "direct-to-consumer", "consumer", "testimonial", "ugc", "review", "fashion", "baby", "parent", "pet", "home goods", "subscription", "kit", "supplement", "wellness", "honest"],
    adFormat: "testimonial_ugc",
    recommendedTier: "premium",
    recommendedRealism: "photo",
    recommendedAspectRatio: "9:16",
    needsCharacter: true,
    storylineBeats: ["Honest problem statement to camera", "Trying the product", "Reaction reveal", "Recommendation + URL"],
    sceneSlots: [
      { purpose: "hook", mood: "Warm", cameraAngle: "Close-up, eye-level", lighting: "Natural window light", colorGrade: "Vibrant saturated", motion: "handheld", duration: 5,
        settingHint: "Real person's bedroom, kitchen, or bathroom — slightly messy in a relatable way, natural window light, no studio gear",
        characterActionHint: "speaking directly to camera (selfie angle), one eyebrow raised mid-explanation, casual t-shirt",
        productPlacementHint: "Product held casually in one hand, label naturally visible, not centred or product-styled" },
      { purpose: "demo", mood: "Playful", cameraAngle: "Medium shot, three-quarter", lighting: "Natural window light", colorGrade: "Vibrant saturated", motion: "handheld", duration: 5,
        settingHint: "Same room — actually using the product (applying, opening, wearing, demonstrating)",
        characterActionHint: "mid-use of the product with a slightly surprised or pleased expression, looking down at product not camera",
        productPlacementHint: "Product in active use, hands and product both in frame, real environment context" },
      { purpose: "reveal", mood: "Aspirational", cameraAngle: "Close-up, eye-level", lighting: "Natural window light", colorGrade: "Vibrant saturated", motion: "static", duration: 5,
        settingHint: "Same room, after using the product — visible reaction, genuine smile",
        characterActionHint: "looking into a mirror or holding result up, real smile breaking through, says one short reaction line",
        productPlacementHint: "Result visible (clean skin, organised drawer, comforted baby) with product faintly in background" },
      { purpose: "cta", mood: "Warm", cameraAngle: "Medium shot, three-quarter", lighting: "Natural window light", colorGrade: "Vibrant saturated", motion: "handheld", duration: 5,
        settingHint: "Final selfie-angle to camera with the product held up beside the face",
        characterActionHint: "holds product up beside face, big honest smile, points at brand/URL caption in frame",
        productPlacementHint: "Product label fully forward, beside person's face, on-screen overlay with URL and discount code" },
    ],
    locationArchetype: {
      name: "Lived-In Bedroom or Kitchen",
      type: "indoor",
      settingHint: "Real-feeling bedroom or kitchen, slightly imperfect (one plant, unmade bed in background, coffee mug on counter), natural daylight",
      timeOfDay: "Mid-morning, 10-11 AM, natural daylight",
      lighting: "Natural window light from camera-left, no artificial lights visible, slightly underexposed (real-iPhone-camera look)",
      surfaces: "Bedsheets with subtle creases, painted wall, wood floor or tile, real kitchen counter clutter",
      atmosphere: "Lived-in, unstaged, warm and a little messy, real-life context",
      colorPalette: "Warm white walls, natural wood, plant green accent, single pop of brand colour from product",
    },
    characterArchetype: {
      role: "Real customer",
      genderHint: "any",
      ageRange: [24, 42],
      expressionHint: "Genuine, slightly self-conscious in front of camera, real laughs, honest reactions",
      styleNotes: "Casual at-home clothing — soft tee, hoodie, comfy sweater. Minimal or no makeup. Hair natural. Friend, not model.",
    },
    voiceoverStyle: "First-person, conversational, slightly imperfect (verbal pauses OK). 'Okay so I was...' opener. Friend telling a story, not a script.",
    musicStyle: "Upbeat indie-pop or lo-fi, 100-110 BPM, light percussion, optional whistle or finger-snap. Reference: Glossier and Native Deodorant social ads.",
    endCardTagline: "Try it. You'll get it.",
    endCardCtaTemplate: "{brand}.com — code {code} for {discount}% off",
  },

  // ───────────────────────────────────────────────────────────────
  // 12. FITNESS / SUPPLEMENT × Product Ad
  // ───────────────────────────────────────────────────────────────
  {
    id: "fitness-product-fuel",
    vertical: "Fitness supplement / energy drink / protein",
    adType: "product_ad",
    formatLabel: "Performance fuel",
    description: "Athlete uses the product mid-effort. Sweat, light, fuel moment, breakthrough. Best for protein, pre-workout, electrolyte, energy drinks.",
    referenceAds: ["Gatorade 'Be Like Mike'", "Celsius creator ads", "Optimum Nutrition athlete edits"],
    keywords: ["protein", "supplement", "pre-workout", "energy drink", "electrolyte", "shaker", "powder", "creatine", "bcaa", "fuel", "performance drink"],
    adFormat: "energetic_sports",
    recommendedTier: "premium",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "9:16",
    needsCharacter: true,
    storylineBeats: ["Setup/pour", "Effort under load", "Product moment as fuel", "Breakthrough"],
    sceneSlots: [
      { purpose: "hook", mood: "Energetic", cameraAngle: "Macro detail", lighting: "Dramatic rim light", colorGrade: "Vibrant saturated", motion: "push in", duration: 4,
        settingHint: "Macro of the product being prepared — powder swirling in water, shaker mixing, can being cracked open",
        productPlacementHint: "Product detail fills frame, brand colour saturated, condensation droplets, action freeze-frame" },
      { purpose: "demo", mood: "Gritty", cameraAngle: "Low angle, heroic", lighting: "Dramatic rim light", colorGrade: "Orange-teal", motion: "handheld", duration: 5,
        settingHint: "Mid-effort training moment — sprint, lift, climb — sweat visible, breath visible",
        characterActionHint: "mid-rep at maximum exertion, jaw set, exhale through clenched teeth",
        productPlacementHint: "Product not in frame this beat — body and effort ARE the story" },
      { purpose: "reveal", mood: "Aspirational", cameraAngle: "Close-up, eye-level", lighting: "Natural window light", colorGrade: "Vibrant saturated", motion: "push in", duration: 5,
        settingHint: "Post-set fuel moment — drinks from the product, eyes close for one beat of relief, then opens with new resolve",
        characterActionHint: "drinks from the product, condensation on the container, eyes close then open with new energy",
        productPlacementHint: "Product label perfectly forward, condensation droplets, brand colour saturated" },
      { purpose: "cta", mood: "Energetic", cameraAngle: "Wide shot, eye-level", lighting: "Studio softbox, key + fill", colorGrade: "Vibrant saturated", motion: "static", duration: 4,
        settingHint: "Product alone against bold brand-colour background with tagline and CTA",
        productPlacementHint: "Product centred, brand mark prominent, single bold tagline, CTA URL" },
    ],
    locationArchetype: {
      name: "Performance Gym + Studio Mix",
      type: "mixed",
      settingHint: "Real gym for action shots (rubber floor, weight rack), clean studio for product hero and reveal",
      timeOfDay: "Pre-dawn for gym (cool), controlled for studio",
      lighting: "Gym: cool 5500K with hard side rim. Studio: bold brand-coloured backdrop with soft front fill.",
      surfaces: "Black rubber gym floor, chrome equipment, matte black weights; clean studio sweep",
      atmosphere: "Sweat, breath, condensation; clean studio isolation for product",
      colorPalette: "Gym cool greys and black, brand colour saturated for product shots",
    },
    characterArchetype: {
      role: "Athlete",
      genderHint: "any",
      ageRange: [22, 30],
      expressionHint: "Focused intensity, real exertion, not modelly",
      styleNotes: "Fitted training apparel in dark or brand colour, athletic footwear, sweat visible",
    },
    voiceoverStyle: "Low, growled, short hard lines. 'Built for the next rep.' Or no VO — sound design only.",
    musicStyle: "Electronic trap or rock-electronic hybrid, 120-140 BPM, hard 808 kicks, crescendo on the fuel moment. Reference: ODESZA build, Apashe, Crystal Castles cuts.",
    endCardTagline: "Earn the next rep.",
    endCardCtaTemplate: "{brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 13. FINTECH × Promo / Sale
  // ───────────────────────────────────────────────────────────────
  {
    id: "fintech-promo-confidence",
    vertical: "Fintech / crypto / investment",
    adType: "promo_sale",
    formatLabel: "Confidence-led promo",
    description: "Bold typography, trust signals, single offer. Clean UI screens. Best for fintech offers, signup bonuses, sale promos, investment products.",
    referenceAds: ["Robinhood signup campaigns", "Cash App offers", "Stripe Atlas promos"],
    keywords: ["fintech", "investment", "stocks", "crypto", "wallet", "banking", "payments", "offer", "signup bonus", "sale", "promo", "discount", "limited time"],
    adFormat: "minimalist_editorial",
    recommendedTier: "premium",
    recommendedRealism: "photo",
    recommendedAspectRatio: "1:1",
    needsCharacter: false,
    storylineBeats: ["Offer headline as hero type", "Proof / trust signals", "Product UI showing the action", "CTA + deadline"],
    sceneSlots: [
      { purpose: "hook", mood: "Dramatic", cameraAngle: "Wide shot, eye-level", lighting: "Dramatic rim light", colorGrade: "Moody dark", motion: "static", duration: 4,
        settingHint: "Dark canvas, single massive offer headline in brand colour ('Get $50 free' / '0% fees' / 'Free 6 months'), small support line below",
        productPlacementHint: "Offer IS the hero. Brand wordmark at 30% opacity bottom-corner." },
      { purpose: "value_prop", mood: "Professional", cameraAngle: "Wide shot, eye-level", lighting: "Bright and airy", colorGrade: "Cool clinical", motion: "pan right", duration: 4,
        settingHint: "Three small trust badges in a row on dark canvas — 'SEC regulated' / '4.8★ App Store' / '500K customers' — each in glass-morphism card",
        productPlacementHint: "Trust badges centred. Brand wordmark top-left." },
      { purpose: "demo", mood: "Aspirational", cameraAngle: "Wide shot, eye-level", lighting: "Bright and airy", colorGrade: "Vibrant saturated", motion: "push in", duration: 4,
        settingHint: "Stylised product UI screen on a phone or floating screen — the action the user will take (deposit, signup, trade) shown clearly",
        productPlacementHint: "Phone or screen mockup centred showing the actual product UI, brand colour CTA button highlighted" },
      { purpose: "cta", mood: "Energetic", cameraAngle: "Wide shot, eye-level", lighting: "Dramatic rim light", colorGrade: "Moody dark", motion: "static", duration: 3,
        settingHint: "Same offer headline as hook but now with deadline countdown ('Ends Sunday'), URL, and CTA button",
        productPlacementHint: "Headline + deadline + URL + CTA button stacked vertically, brand colour saturated" },
    ],
    locationArchetype: {
      name: "Dark Brand Canvas",
      type: "studio",
      settingHint: "Pitch-black background, floating typography and UI cards, brand-colour glow accents",
      timeOfDay: "N/A — controlled abstract",
      lighting: "Single brand-colour key + magenta rim for depth",
      surfaces: "Glass morphism cards, polished black floor, typography",
      atmosphere: "Confident, modern, slightly aspirational",
      colorPalette: "Black + brand primary + green for positive numbers / CTA",
    },
    voiceoverStyle: "Confident neutral, slightly punchier than B2B SaaS. Single short offer line, then proof, then CTA.",
    musicStyle: "Modern electronic with a single bass drop on the offer reveal, 110 BPM, no vocals. Reference: Robinhood ad music, modern crypto promo style.",
    endCardTagline: "{Offer} ends {Date}.",
    endCardCtaTemplate: "{brand}.com",
  },

  // ───────────────────────────────────────────────────────────────
  // 14. HOME / REAL ESTATE / TRAVEL × Brand Campaign
  // ───────────────────────────────────────────────────────────────
  {
    id: "home-travel-brand-warmth",
    vertical: "Home goods, real estate, travel, hospitality",
    adType: "brand_campaign",
    formatLabel: "Lived-in warmth",
    description: "Warm interiors, slow camera, real-life moments. Sells the feeling of a place. Best for home goods, real estate, hotels, travel brands, furniture.",
    referenceAds: ["Airbnb 'Belong Anywhere'", "Crate & Barrel lifestyle films", "Marriott Bonvoy storytelling"],
    keywords: ["home", "furniture", "decor", "real estate", "hotel", "travel", "hospitality", "airbnb", "stay", "interior", "lifestyle", "warmth", "destination"],
    adFormat: "cinematic_lifestyle",
    recommendedTier: "premium",
    recommendedRealism: "cinematic",
    recommendedAspectRatio: "16:9",
    needsCharacter: true,
    storylineBeats: ["Wide establishing of the space", "Intimate human moment within it", "Detail of a beloved object", "Brand mark + invitation"],
    sceneSlots: [
      { purpose: "hook", mood: "Warm", cameraAngle: "Wide shot, eye-level", lighting: "Golden hour backlight", colorGrade: "Warm cinematic", motion: "push in", duration: 5,
        settingHint: "Wide establishing of a warm lived-in interior or destination — sun streaming through windows, soft shadows, real-life clutter",
        characterActionHint: "small in frame, in motion across the space (walking through doorway, opening curtains, setting down a mug)",
        productPlacementHint: "Brand environment/product as the room itself — furniture, the hotel suite, the home" },
      { purpose: "value_prop", mood: "Calm", cameraAngle: "Medium shot, three-quarter", lighting: "Warm practical lamps", colorGrade: "Warm cinematic", motion: "static", duration: 5,
        settingHint: "Intimate moment within the space — reading by the window, sharing a meal, watching the sunrise from the bed",
        characterActionHint: "engaged in a quiet moment, eyes soft, hands relaxed around a mug or book",
        productPlacementHint: "Product/space envelopes the character, soft warm lamps, brand element subtly visible (label on mug, signage, headboard)" },
      { purpose: "reveal", mood: "Warm", cameraAngle: "Macro detail", lighting: "Warm practical lamps", colorGrade: "Warm cinematic", motion: "push in", duration: 5,
        settingHint: "Close-up of a beloved detail — a curated bookshelf, a steam from a cup, a hand on a soft fabric, the texture of a brand-signature pillow",
        characterActionHint: "hand interacts with the detail tenderly",
        productPlacementHint: "Detail of a brand-specific element (the signature scent diffuser, the woven throw, the curated mini-bar)" },
      { purpose: "cta", mood: "Aspirational", cameraAngle: "Wide shot, eye-level", lighting: "Golden hour backlight", colorGrade: "Warm cinematic", motion: "static", duration: 5,
        settingHint: "Wide of the space at dusk, single warm lamp glowing through window, brand wordmark and invitation",
        productPlacementHint: "Space dominates, brand wordmark elegant in lower-third, CTA URL below" },
    ],
    locationArchetype: {
      name: "Warm Lived-In Interior",
      type: "indoor",
      settingHint: "Warm hardwood floors, layered textiles, real plants, single curated bookshelf, large window with golden afternoon light",
      timeOfDay: "Late afternoon, 4-5 PM golden warmth",
      lighting: "Warm 3200K window light from camera-left, supplemented by 2700K practical table lamps, soft shadow play",
      surfaces: "Wide-plank oak floor, linen upholstery, ceramic mug, woven throw, brushed wood",
      atmosphere: "Lived-in warmth, hint of a story, slight steam from a drink, gentle ambient quiet",
      colorPalette: "Honey oak, terracotta, cream linen, deep green plant accent, brand colour from a single object",
    },
    characterArchetype: {
      role: "Resident / guest",
      genderHint: "any",
      ageRange: [30, 50],
      expressionHint: "Quiet contentment, soft eyes, small genuine smile",
      styleNotes: "Soft natural fibres — cashmere, linen — in warm neutrals, comfortable not styled, simple silver or no jewellery",
    },
    voiceoverStyle: "Warm, intimate, conversational. Storyteller voice — 'There's a moment, just before...'. One sentence per beat.",
    musicStyle: "Warm acoustic with subtle strings, 70 BPM, fingerpicked guitar or solo piano with cello pad. Reference: Bon Iver acoustic, Olafur Arnalds 'Re:member' calmer cuts.",
    endCardTagline: "Come home to {brand}.",
    endCardCtaTemplate: "{brand}.com",
  },

];

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

export function getTemplate(id: string): GoldenTemplate | undefined {
  return GOLDEN_TEMPLATES.find((t) => t.id === id);
}

/**
 * Lightweight keyword-based classifier — picks the best template for a free-text
 * idea. Used as a robust fallback if Gemini's classifier fails or misclassifies.
 * Scores each template by keyword matches in the idea (+1 each), filtered by
 * matching adType if provided. Ties broken by template position.
 */
export function pickTemplateByKeywords(idea: string, adType?: AdType): GoldenTemplate {
  const lower = idea.toLowerCase();
  const candidates = adType ? GOLDEN_TEMPLATES.filter((t) => t.adType === adType) : GOLDEN_TEMPLATES;
  const pool = candidates.length > 0 ? candidates : GOLDEN_TEMPLATES;

  let best = pool[0];
  let bestScore = 0;
  for (const t of pool) {
    const score = t.keywords.reduce((s, kw) => s + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}

/** Compact summary fed to the Gemini classifier so it knows what options exist. */
export function templateClassifierSummary(): string {
  return GOLDEN_TEMPLATES.map(
    (t) => `- id: "${t.id}" — ${t.vertical} · ${t.adType}. ${t.description}`
  ).join("\n");
}

/** UI-friendly list of all ad types. */
export const AD_TYPE_LABELS: Record<AdType, string> = {
  brand_campaign: "Brand Campaign",
  product_ad: "Product Ad",
  testimonial_ugc: "Testimonial / UGC",
  launch_announcement: "Launch Announcement",
  explainer: "Explainer / How It Works",
  promo_sale: "Promo / Sale",
};
