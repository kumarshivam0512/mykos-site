"use client";

// ─── Sidebar (Phase A3 — context-aware) ─────────────────────────
//
// The sidebar focuses on NAVIGATION ONLY. Workspace selection moved to the
// TopBar. The sections shown depend on context:
//
//   • Signed-out / no brand:   minimal — Home, Sign in
//   • Brand active:            brand-scoped nav — Dashboard, Campaigns,
//                              Brand Library, Analytics
//   • Inside a campaign:       brand nav + campaign workflow rail
//                              (workflow rail wired in Phase D)
//
// Visual: 224px expanded / 64px collapsed (icons only). No section badges.
// Each item has an icon + label so collapsed mode is still legible.

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Building2,
  Palette,
  TrendingUp,
  Image as ImageIcon,
  Video,
  Users,
  MapPin,
  Layers,
  Target,
  Swords,
  Globe,
} from "lucide-react";
import { useActiveBrand, useActiveCampaign } from "@/lib/hooks/use-workspace";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { brand } = useActiveBrand();
  const { campaign } = useActiveCampaign();
  const [collapsed, setCollapsed] = useState(false);

  // Hide sidebar on the login page.
  if (pathname === "/login") return null;

  // Compose nav based on context.
  const sections = buildSections({ hasBrand: !!brand, hasCampaign: !!campaign });

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-56"} bg-card border-r border-border flex flex-col shrink-0 transition-all duration-200`}
    >
      {/* Nav */}
      <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={section.title ?? `unnamed-${sIdx}`}>
            {!collapsed && section.title && (
              <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-brand/10 text-brand font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function buildSections({ hasBrand, hasCampaign }: { hasBrand: boolean; hasCampaign: boolean }): NavSection[] {
  const sections: NavSection[] = [];

  // Always-on top section.
  sections.push({
    items: [
      { label: "Dashboard", href: "/workspace", icon: <Home className="w-4 h-4" /> },
    ],
  });

  if (hasBrand) {
    sections.push({
      title: "Brand",
      items: [
        { label: "Brand kit", href: "/brand", icon: <Building2 className="w-4 h-4" /> },
        { label: "Audience", href: "/brand/audience", icon: <Target className="w-4 h-4" /> },
        { label: "Competitors", href: "/brand/competitors", icon: <Swords className="w-4 h-4" /> },
        { label: "Platforms", href: "/brand/platforms", icon: <Globe className="w-4 h-4" /> },
      ],
    });
    sections.push({
      title: "Library",
      items: [
        { label: "Characters", href: "/creative/characters", icon: <Users className="w-4 h-4" /> },
        { label: "Locations", href: "/creative/locations", icon: <MapPin className="w-4 h-4" /> },
      ],
    });
  }

  if (hasCampaign) {
    sections.push({
      title: "Campaign",
      items: [
        { label: "Scenes", href: "/creative", icon: <Layers className="w-4 h-4" /> },
        { label: "Video", href: "/creative/video", icon: <Video className="w-4 h-4" /> },
        { label: "Poster", href: "/creative/poster", icon: <ImageIcon className="w-4 h-4" /> },
        { label: "Post studio", href: "/creative/post", icon: <Palette className="w-4 h-4" /> },
      ],
    });
  }

  sections.push({
    title: "Analytics",
    items: [
      { label: "Campaigns", href: "/performance/campaigns", icon: <Layers className="w-4 h-4" /> },
      { label: "Performance", href: "/performance/analytics", icon: <TrendingUp className="w-4 h-4" /> },
    ],
  });

  return sections;
}
