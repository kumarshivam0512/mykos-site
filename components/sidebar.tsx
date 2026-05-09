"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Sparkles,
  BarChart3,
  FolderOpen,
  Target,
  Film,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Home,
  Zap,
  LogOut,
  LogIn,
  Building2,
  Image,
  UserCircle,
  Swords,
  Globe,
  Palette,
  Video,
  TrendingUp,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <Home className="w-5 h-5" /> },
  {
    label: "Brand Hub",
    href: "/brand",
    icon: <Building2 className="w-5 h-5" />,
    children: [
      { label: "Brand Setup", href: "/brand" },
      { label: "Audience Intel", href: "/brand/audience" },
      { label: "Competitors", href: "/brand/competitors" },
      { label: "Platform Strategy", href: "/brand/platforms" },
    ],
  },
  {
    label: "Creative Hub",
    href: "/creative",
    icon: <Palette className="w-5 h-5" />,
    children: [
      { label: "Scene Builder", href: "/creative" },
      { label: "Poster Studio", href: "/creative/poster" },
      { label: "Video Studio", href: "/creative/video" },
      { label: "Character Library", href: "/creative/characters" },
      { label: "Location Library", href: "/creative/locations" },
    ],
  },
  {
    label: "Performance Hub",
    href: "/performance",
    icon: <TrendingUp className="w-5 h-5" />,
    children: [
      { label: "Analytics", href: "/performance/analytics" },
      { label: "Campaigns", href: "/performance/campaigns" },
      { label: "AI Recommendations", href: "/performance/recommendations" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("Creative Studio");

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-56"
      } bg-card border-r border-border flex flex-col shrink-0 transition-all duration-200`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-2 border-b border-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight">Mykos AI</span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const isSection = !!item.children;
          const isExpanded = expandedSection === item.label;

          return (
            <div key={item.label}>
              <button
                onClick={() => {
                  if (isSection) {
                    setExpandedSection(isExpanded ? null : item.label);
                    if (collapsed) setCollapsed(false);
                  } else {
                    router.push(item.href);
                  }
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive && !isSection
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {isSection && (
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    )}
                  </>
                )}
              </button>

              {/* Children */}
              {isSection && isExpanded && !collapsed && (
                <div className="ml-6 mt-1 space-y-0.5 border-l border-border pl-3">
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <button
                        key={child.href}
                        onClick={() => router.push(child.href)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          childActive
                            ? "text-primary font-medium bg-primary/5"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {child.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User + Collapse */}
      <div className="p-2 border-t border-border space-y-1">
        {session?.user ? (
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-2`}>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{session.user.name || session.user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              </div>
            )}
            <button onClick={() => signOut()} title="Sign out" className="text-muted-foreground hover:text-foreground shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <LogIn className="w-4 h-4" />
            {!collapsed && <span>Sign In</span>}
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
