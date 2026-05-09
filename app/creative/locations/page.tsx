"use client";

import { useEffect, useState } from "react";
import { useAdStore } from "@/store/use-ad-store";
import type { Location } from "@/lib/db/locations";
import {
  MapPin,
  Plus,
  Trash2,
  Loader2,
  Save,
  X,
  Copy,
} from "lucide-react";

const LOCATION_TYPES = ["indoor", "outdoor", "studio", "mixed"];
const TIME_PRESETS = ["golden hour", "midday bright", "overcast morning", "blue hour dusk", "night / artificial", "sunrise", "natural daylight"];

export default function LocationLibraryPage() {
  const { productInput } = useAdStore();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", type: "indoor", setting: "", timeOfDay: "natural daylight",
    lighting: "", surfaces: "", atmosphere: "", props: "",
    colorPalette: "", soundscape: "", weatherCondition: "",
  });

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLocations(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.setting) return;
    setSaving(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, brandName: productInput.name || "General" }),
      });
      if (res.ok) {
        const loc = await res.json();
        setLocations([loc, ...locations]);
        setShowForm(false);
        setForm({ name: "", type: "indoor", setting: "", timeOfDay: "natural daylight", lighting: "", surfaces: "", atmosphere: "", props: "", colorPalette: "", soundscape: "", weatherCondition: "" });
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
      if (res.ok) setLocations(locations.filter((l) => l.id !== id));
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const generateSheet = (loc: Location): string => {
    return [
      `${loc.type} location: ${loc.setting}`,
      loc.timeOfDay ? `Time: ${loc.timeOfDay}` : "",
      loc.lighting ? `Lighting: ${loc.lighting}` : "",
      loc.surfaces ? `Surfaces: ${loc.surfaces}` : "",
      loc.atmosphere ? `Atmosphere: ${loc.atmosphere}` : "",
      loc.props ? `Props: ${loc.props}` : "",
      loc.colorPalette ? `Colors: ${loc.colorPalette}` : "",
      loc.weatherCondition ? `Weather: ${loc.weatherCondition}` : "",
    ].filter(Boolean).join(". ");
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" /> Location Library
            </h1>
            <p className="text-muted-foreground text-sm">
              Create reusable locations for consistent environments across scenes. Use <code className="bg-secondary px-1 rounded">@location</code> in the Scene Builder.
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Location
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Create Location</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Urban Rooftop Gym" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm capitalize">
                  {LOCATION_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Time of Day</label>
                <select value={form.timeOfDay} onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm">
                  {TIME_PRESETS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Setting / Description *</label>
              <textarea value={form.setting} onChange={(e) => setForm({ ...form, setting: e.target.value })}
                placeholder="e.g., A modern rooftop gym with floor-to-ceiling windows overlooking Mumbai skyline, exposed steel beams, industrial aesthetic"
                rows={2} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none" />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Lighting</label>
              <textarea value={form.lighting} onChange={(e) => setForm({ ...form, lighting: e.target.value })}
                placeholder="e.g., Warm golden hour backlight from west-facing windows, soft fill from overhead LED panels, contrast ratio 3:1"
                rows={2} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Surfaces & Materials</label>
                <textarea value={form.surfaces} onChange={(e) => setForm({ ...form, surfaces: e.target.value })}
                  placeholder="e.g., polished concrete floors, exposed brick walls, matte black equipment"
                  rows={2} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Atmosphere / Environmental FX</label>
                <textarea value={form.atmosphere} onChange={(e) => setForm({ ...form, atmosphere: e.target.value })}
                  placeholder="e.g., Slight haze from morning fog, dust motes in light beams, condensation on windows"
                  rows={2} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Props in Scene</label>
                <textarea value={form.props} onChange={(e) => setForm({ ...form, props: e.target.value })}
                  placeholder="e.g., dumbbells on rack, yoga mats rolled by wall, water bottles on bench"
                  rows={2} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Color Palette</label>
                <input value={form.colorPalette} onChange={(e) => setForm({ ...form, colorPalette: e.target.value })}
                  placeholder="e.g., warm greys, matte black, brushed steel, neon orange accents"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Soundscape (for video)</label>
                <input value={form.soundscape} onChange={(e) => setForm({ ...form, soundscape: e.target.value })}
                  placeholder="e.g., Low ambient music, distant traffic, clinking weights"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Weather (outdoor)</label>
                <input value={form.weatherCondition} onChange={(e) => setForm({ ...form, weatherCondition: e.target.value })}
                  placeholder="e.g., Clear sky, gentle breeze, light cloud cover"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>

            <button onClick={handleSave} disabled={saving || !form.name || !form.setting}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Location
            </button>
          </div>
        )}

        {/* Location List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : locations.length === 0 && !showForm ? (
          <div className="text-center py-20 space-y-4">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No locations yet</p>
            <button onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl">
              Create Your First Location
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => (
              <div key={loc.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{loc.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        <span className="capitalize">{loc.type}</span> · {loc.timeOfDay}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{loc.setting}</p>
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        {loc.lighting && <p><span className="text-foreground/70">Lighting:</span> {loc.lighting}</p>}
                        {loc.surfaces && <p><span className="text-foreground/70">Surfaces:</span> {loc.surfaces}</p>}
                        {loc.atmosphere && <p><span className="text-foreground/70">Atmosphere:</span> {loc.atmosphere}</p>}
                        {loc.props && <p><span className="text-foreground/70">Props:</span> {loc.props}</p>}
                        {loc.colorPalette && <p><span className="text-foreground/70">Colors:</span> {loc.colorPalette}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigator.clipboard.writeText(generateSheet(loc))}
                      title="Copy location sheet" className="text-muted-foreground hover:text-foreground p-1.5">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(loc.id)} disabled={deleting === loc.id}
                      className="text-muted-foreground hover:text-red-400 p-1.5">
                      {deleting === loc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
