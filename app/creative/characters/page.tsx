"use client";

import { useEffect, useState } from "react";
import { useAdStore } from "@/store/use-ad-store";
import type { Character } from "@/lib/db/characters";
import {
  UserCircle,
  Plus,
  Trash2,
  Loader2,
  Save,
  X,
  Copy,
} from "lucide-react";

export default function CharacterLibraryPage() {
  const { productInput } = useAdStore();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "", gender: "Male", age: 28, ethnicity: "", build: "",
    face: "", hair: "", outfit: "", skinDetails: "", expression: "confident, natural", accessories: "",
  });

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCharacters(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, brandName: productInput.name || "General" }),
      });
      if (res.ok) {
        const char = await res.json();
        setCharacters([char, ...characters]);
        setShowForm(false);
        setForm({ name: "", gender: "Male", age: 28, ethnicity: "", build: "", face: "", hair: "", outfit: "", skinDetails: "", expression: "confident, natural", accessories: "" });
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
      if (res.ok) setCharacters(characters.filter((c) => c.id !== id));
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const generateSheet = (char: Character): string => {
    return [
      `${char.gender}, ${char.age} years old, ${char.ethnicity}, ${char.build}`,
      char.face ? `Face: ${char.face}` : "",
      char.hair ? `Hair: ${char.hair}` : "",
      char.outfit ? `Outfit: ${char.outfit}` : "",
      char.skinDetails ? `Skin: ${char.skinDetails}` : "",
      char.expression ? `Expression: ${char.expression}` : "",
      char.accessories ? `Accessories: ${char.accessories}` : "",
    ].filter(Boolean).join(". ");
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCircle className="w-6 h-6 text-primary" /> Character Library
            </h1>
            <p className="text-muted-foreground text-sm">
              Create reusable characters for consistent appearance across all ad scenes.
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Character
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Create Character</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Fitness Priya" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm">
                  <option>Male</option><option>Female</option><option>Non-binary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Age</label>
                <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ethnicity</label>
                <input value={form.ethnicity} onChange={(e) => setForm({ ...form, ethnicity: e.target.value })}
                  placeholder="e.g., Indian, South Asian" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Build (height, weight, type)</label>
                <input value={form.build} onChange={(e) => setForm({ ...form, build: e.target.value })}
                  placeholder="e.g., athletic lean, 175cm, 72kg" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Face Details</label>
              <input value={form.face} onChange={(e) => setForm({ ...form, face: e.target.value })}
                placeholder="e.g., angular jawline, short stubble, thick dark eyebrows, brown eyes"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Hair</label>
              <input value={form.hair} onChange={(e) => setForm({ ...form, hair: e.target.value })}
                placeholder="e.g., black, cropped short on sides, longer on top, styled with matte product"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Outfit (be very specific)</label>
              <textarea value={form.outfit} onChange={(e) => setForm({ ...form, outfit: e.target.value })}
                placeholder="e.g., fitted charcoal compression tee showing arm definition, black mid-thigh training shorts, white Nike Air Force 1 mid-tops with grey swoosh"
                rows={2} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Skin Details</label>
                <input value={form.skinDetails} onChange={(e) => setForm({ ...form, skinDetails: e.target.value })}
                  placeholder="e.g., medium-brown, slight perspiration sheen"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Expression</label>
                <input value={form.expression} onChange={(e) => setForm({ ...form, expression: e.target.value })}
                  placeholder="e.g., focused, confident, slight half-smile"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Accessories</label>
              <input value={form.accessories} onChange={(e) => setForm({ ...form, accessories: e.target.value })}
                placeholder="e.g., black digital watch, wireless earbuds"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" />
            </div>

            <button onClick={handleSave} disabled={saving || !form.name}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Character
            </button>
          </div>
        )}

        {/* Character List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : characters.length === 0 && !showForm ? (
          <div className="text-center py-20 space-y-4">
            <UserCircle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No characters yet</p>
            <button onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl">
              Create Your First Character
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {characters.map((char) => (
              <div key={char.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg font-bold shrink-0">
                      {char.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{char.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {char.gender}, {char.age} · {char.ethnicity} · {char.build}
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        {char.face && <p><span className="text-foreground/70">Face:</span> {char.face}</p>}
                        {char.hair && <p><span className="text-foreground/70">Hair:</span> {char.hair}</p>}
                        {char.outfit && <p><span className="text-foreground/70">Outfit:</span> {char.outfit}</p>}
                        {char.accessories && <p><span className="text-foreground/70">Accessories:</span> {char.accessories}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigator.clipboard.writeText(generateSheet(char))}
                      title="Copy character sheet" className="text-muted-foreground hover:text-foreground p-1.5">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(char.id)} disabled={deleting === char.id}
                      className="text-muted-foreground hover:text-red-400 p-1.5">
                      {deleting === char.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
