"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ChannelData {
  channel: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface AnalyticsEntry {
  id: string;
  brandName: string;
  period: string;
  channels: ChannelData[];
  totalSpend: number;
  totalRevenue: number;
  createdAt: string;
}

interface Recommendation {
  summary: string;
  recommendations: { channel: string; currentSpend: number; recommendedSpend: number; changePercent: number; reason: string }[];
  keyInsights: string[];
  riskFactors: string[];
}

const COLORS = ["#a855f7", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#6366f1"];
const DEFAULT_CHANNELS: ChannelData[] = [
  { channel: "Meta Ads", spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
  { channel: "Google Ads", spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
  { channel: "TikTok", spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
];

export default function AnalyticsPage() {
  const [entries, setEntries] = useState<AnalyticsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [period, setPeriod] = useState("");
  const [channels, setChannels] = useState<ChannelData[]>(JSON.parse(JSON.stringify(DEFAULT_CHANNELS)));

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEntries(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!brandName || !period) return;
    setSaving(true);
    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, period, channels: channels.filter((c) => c.spend > 0) }),
      });
      if (res.ok) {
        const entry = await res.json();
        setEntries((prev) => [entry, ...prev]);
        setShowForm(false);
        setChannels(JSON.parse(JSON.stringify(DEFAULT_CHANNELS)));
      }
    } catch { /* ignore */ }
    setSaving(false);
  }, [brandName, period, channels]);

  const getRecommendations = useCallback(async () => {
    const latestEntry = entries[0];
    if (!latestEntry) return;
    setLoadingRec(true);
    try {
      const res = await fetch("/api/analytics/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: latestEntry.channels, totalBudget: latestEntry.totalSpend }),
      });
      if (res.ok) setRecommendation(await res.json());
    } catch { /* ignore */ }
    setLoadingRec(false);
  }, [entries]);

  // Aggregate metrics from latest entry
  const latest = entries[0];
  const totalSpend = latest?.totalSpend || 0;
  const totalRevenue = latest?.totalRevenue || 0;
  const totalImpressions = latest?.channels.reduce((s, c) => s + c.impressions, 0) || 0;
  const totalClicks = latest?.channels.reduce((s, c) => s + c.clicks, 0) || 0;
  const totalConversions = latest?.channels.reduce((s, c) => s + c.conversions, 0) || 0;
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0";
  const cpa = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : "0";
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> Marketing Analytics
            </h1>
            <p className="text-muted-foreground text-sm">Track performance, optimize budgets, get AI recommendations</p>
          </div>
          <div className="flex gap-2">
            {entries.length > 0 && (
              <button
                onClick={getRecommendations}
                disabled={loadingRec}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
              >
                {loadingRec ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI Recommendations
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Data
            </button>
          </div>
        </div>

        {/* Data Input Form */}
        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Add Performance Data</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Brand Name</label>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Avvatar Protein"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Period</label>
                <input
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="e.g., 2026-W18 or May 2026"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium">
                <span>Channel</span><span>Spend ($)</span><span>Impressions</span><span>Clicks</span><span>Conversions</span><span>Revenue ($)</span>
              </div>
              {channels.map((ch, i) => (
                <div key={i} className="grid grid-cols-6 gap-2">
                  <input value={ch.channel} onChange={(e) => { const u = [...channels]; u[i].channel = e.target.value; setChannels(u); }}
                    className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm" />
                  {(["spend", "impressions", "clicks", "conversions", "revenue"] as const).map((field) => (
                    <input key={field} type="number" value={ch[field] || ""} onChange={(e) => { const u = [...channels]; u[i][field] = Number(e.target.value); setChannels(u); }}
                      className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm" placeholder="0" />
                  ))}
                </div>
              ))}
              <button
                onClick={() => setChannels([...channels, { channel: "", spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }])}
                className="text-xs text-primary hover:text-primary/80"
              >
                + Add channel
              </button>
            </div>

            <button onClick={handleSave} disabled={saving || !brandName || !period}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium">
              {saving ? "Saving..." : "Save Data"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 && !showForm ? (
          <div className="text-center py-20 space-y-4">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No analytics data yet</p>
            <button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl">
              Add Your First Data
            </button>
          </div>
        ) : entries.length > 0 && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Total Spend" value={`$${totalSpend.toLocaleString()}`} color="text-red-400" />
              <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Revenue" value={`$${totalRevenue.toLocaleString()}`} color="text-green-400" />
              <KpiCard icon={<ShoppingCart className="w-5 h-5" />} label="ROAS" value={`${roas}x`} color="text-primary" />
              <KpiCard icon={<MousePointer className="w-5 h-5" />} label="CPA" value={`$${cpa}`} color="text-amber-400" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard icon={<Eye className="w-5 h-5" />} label="Impressions" value={totalImpressions.toLocaleString()} color="text-blue-400" />
              <KpiCard icon={<MousePointer className="w-5 h-5" />} label="CTR" value={`${ctr}%`} color="text-purple-400" />
              <KpiCard icon={<ShoppingCart className="w-5 h-5" />} label="Conversions" value={totalConversions.toLocaleString()} color="text-green-400" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Spend by Channel */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-medium text-sm mb-4">Spend by Channel</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={latest?.channels || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="channel" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="spend" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ROAS by Channel */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-medium text-sm mb-4">ROAS by Channel</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={(latest?.channels || []).map((c) => ({ ...c, roas: c.spend > 0 ? +(c.revenue / c.spend).toFixed(2) : 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="channel" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="roas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Spend Distribution Pie */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-medium text-sm mb-4">Spend Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={(latest?.channels || []).filter((c) => c.spend > 0)}
                      dataKey="spend"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {(latest?.channels || []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Conversion Funnel */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-medium text-sm mb-4">Conversion Funnel</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { stage: "Impressions", value: totalImpressions },
                    { stage: "Clicks", value: totalClicks },
                    { stage: "Conversions", value: totalConversions },
                  ]} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 12, fill: "#a1a1aa" }} width={90} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Recommendations */}
            {recommendation && (
              <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> AI Budget Recommendations
                </h3>
                <p className="text-sm text-muted-foreground">{recommendation.summary}</p>

                <div className="space-y-3">
                  {recommendation.recommendations.map((rec, i) => (
                    <div key={i} className="bg-secondary/50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{rec.channel}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-mono font-bold ${rec.changePercent > 0 ? "text-green-400" : rec.changePercent < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          {rec.changePercent > 0 ? "+" : ""}{rec.changePercent}%
                        </span>
                        <p className="text-xs text-muted-foreground">
                          ${rec.currentSpend} → ${rec.recommendedSpend}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Key Insights</h4>
                    <ul className="space-y-1">
                      {recommendation.keyInsights.map((insight, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <TrendingUp className="w-3 h-3 text-green-400 mt-1 shrink-0" /> {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Risk Factors</h4>
                    <ul className="space-y-1">
                      {recommendation.riskFactors.map((risk, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <TrendingDown className="w-3 h-3 text-amber-400 mt-1 shrink-0" /> {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            {entries.length > 1 && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-3">History ({entries.length} entries)</h3>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{entry.brandName} — {entry.period}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.channels.length} channels · Spend: ${entry.totalSpend.toLocaleString()} · Revenue: ${entry.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
