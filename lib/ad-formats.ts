import type { AdFormat } from "./types";

export interface AdFormatDefinition {
  id: AdFormat;
  name: string;
  useCases: string;
  visual: string;
  icon: string; // emoji
}

export const AD_FORMATS: AdFormatDefinition[] = [
  {
    id: "cinematic_lifestyle",
    name: "Cinematic Lifestyle",
    useCases: "Fashion, shoes, beverages, fitness",
    visual:
      "Human-centric, emotional storytelling, shallow depth of field, warm tones",
    icon: "🎬",
  },
  {
    id: "animated_explainer",
    name: "Animated Explainer",
    useCases: "SaaS, apps, tech products",
    visual:
      "Screen recordings, motion graphics, clean transitions, flat design",
    icon: "💻",
  },
  {
    id: "product_showcase",
    name: "Product Showcase",
    useCases: "Electronics, cosmetics, luxury goods",
    visual: "Hero product shots, 360 rotation, macro details, studio lighting",
    icon: "✨",
  },
  {
    id: "testimonial_ugc",
    name: "Testimonial / UGC",
    useCases: "D2C brands, food delivery",
    visual: "Casual, authentic, handheld camera feel, natural lighting",
    icon: "📱",
  },
  {
    id: "minimalist_editorial",
    name: "Minimalist Editorial",
    useCases: "Premium, luxury, high-fashion",
    visual:
      "Negative space, soft diffusion, restrained palette, muted elegance",
    icon: "🖤",
  },
  {
    id: "energetic_sports",
    name: "Energetic / Sports",
    useCases: "Fitness, energy drinks, athleisure",
    visual: "Fast-paced, bold colors, dynamic camera work, high contrast",
    icon: "⚡",
  },
];

export function getFormatById(id: AdFormat): AdFormatDefinition | undefined {
  return AD_FORMATS.find((f) => f.id === id);
}
