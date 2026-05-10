"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/components/ImageUpload";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface BeautyProfessional {
  id: string;
  name: string;
  type: "MUA" | "HAIRSTYLIST";
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  cost: string | null;
  trials: BeautyTrial[];
}

interface BeautyTrial {
  id: string;
  professionalId: string;
  date: string;
  location: string | null;
  notes: string | null;
  outcome: string | null;
  professional?: { id: string; name: string; type: "MUA" | "HAIRSTYLIST" };
}

interface BeautyInspiration {
  id: string;
  imageUrl: string;
  caption: string | null;
}

interface NoteType {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

type ModalType =
  | "professional"
  | "trial"
  | "inspiration"
  | null;

/* ─── Default Form State ─── */

const defaultProfessionalForm = {
  name: "",
  type: "MUA" as "MUA" | "HAIRSTYLIST",
  email: "",
  phone: "",
  website: "",
  instagram: "",
  notes: "",
  cost: "",
};

const defaultTrialForm = {
  professionalId: "",
  date: "",
  location: "",
  notes: "",
  outcome: "Scheduled",
};

const defaultInspirationForm = {
  imageUrl: "",
  caption: "",
};

/* ─── Skeleton ─── */

function BeautySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-12 w-56 bg-surface-container rounded-xl" />
          <div className="mt-2 h-4 w-80 bg-surface-container rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="h-64 bg-surface-container-low rounded-3xl" />
        <div className="h-64 bg-surface-container-low rounded-3xl" />
      </div>
      <div className="h-48 bg-surface-container-low rounded-3xl" />
      <div className="h-56 bg-surface-container-low rounded-3xl" />
    </div>
  );
}

/* ─── Helpers ─── */

function formatCost(cost: string | null): string {
  if (!cost) return "";
  const num = parseFloat(cost);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateForInput(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
}

function outcomeColor(outcome: string | null): string {
  switch (outcome) {
    case "Completed":
      return "bg-emerald-100 text-emerald-700";
    case "Cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

/* ─── Page ─── */

export default function BeautyPage() {
  const [professionals, setProfessionals] = useState<BeautyProfessional[]>([]);
  const [trials, setTrials] = useState<BeautyTrial[]>([]);
  const [inspiration, setInspiration] = useState<BeautyInspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingProfessional, setEditingProfessional] = useState<BeautyProfessional | null>(null);
  const [editingTrial, setEditingTrial] = useState<BeautyTrial | null>(null);

  // Form state
  const [profForm, setProfForm] = useState(defaultProfessionalForm);
  const [trialForm, setTrialForm] = useState(defaultTrialForm);
  const [inspForm, setInspForm] = useState(defaultInspirationForm);

  // Notes (database-backed)
  const [beautyNotes, setBeautyNotes] = useState<NoteType[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchAll();
    fetchNotes();
  }, []);

  const fetchAll = async () => {
    const start = Date.now();
    try {
      const [profRes, trialRes, inspRes] = await Promise.all([
        fetch("/api/beauty/professionals"),
        fetch("/api/beauty/trials"),
        fetch("/api/beauty/inspiration"),
      ]);
      const [profData, trialData, inspData] = await Promise.all([
        profRes.json(),
        trialRes.json(),
        inspRes.json(),
      ]);
      if (Array.isArray(profData)) setProfessionals(profData);
      if (Array.isArray(trialData)) setTrials(trialData);
      if (Array.isArray(inspData)) setInspiration(inspData);
    } catch {
      // silently fail
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise((r) => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  };

  /* ─── Notes CRUD ─── */

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes?section=beauty");
      const data = await res.json();
      if (Array.isArray(data)) setBeautyNotes(data);
    } catch {
      // silently fail
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "beauty", content: newNote.trim() }),
      });
      if (res.ok) {
        const note = await res.json();
        setBeautyNotes((prev) => [note, ...prev]);
        setNewNote("");
      }
    } catch {
      // silently fail
    } finally {
      setSavingNote(false);
    }
  };

  const startEditingNote = (note: NoteType) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const handleUpdateNote = async (id: string) => {
    if (!editingNoteContent.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingNoteContent.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBeautyNotes((prev) =>
          prev.map((n) => (n.id === id ? updated : n))
        );
        setEditingNoteId(null);
        setEditingNoteContent("");
      }
    } catch {
      // silently fail
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBeautyNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  /* ─── Professional CRUD ─── */

  const openAddProfessional = (type: "MUA" | "HAIRSTYLIST") => {
    setEditingProfessional(null);
    setProfForm({ ...defaultProfessionalForm, type });
    setModalType("professional");
  };

  const openEditProfessional = (prof: BeautyProfessional) => {
    setEditingProfessional(prof);
    setProfForm({
      name: prof.name,
      type: prof.type,
      email: prof.email || "",
      phone: prof.phone || "",
      website: prof.website || "",
      instagram: prof.instagram || "",
      notes: prof.notes || "",
      cost: prof.cost || "",
    });
    setModalType("professional");
  };

  const handleProfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: profForm.name,
      type: profForm.type,
      email: profForm.email || null,
      phone: profForm.phone || null,
      website: profForm.website || null,
      instagram: profForm.instagram || null,
      notes: profForm.notes || null,
      cost: profForm.cost ? parseFloat(profForm.cost) : null,
    };
    try {
      const url = editingProfessional
        ? `/api/beauty/professionals/${editingProfessional.id}`
        : "/api/beauty/professionals";
      const method = editingProfessional ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchAll();
        setModalType(null);
        setEditingProfessional(null);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const deleteProfessional = async (id: string) => {
    if (!confirm("Delete this professional? Their trials will also be removed.")) return;
    try {
      const res = await fetch(`/api/beauty/professionals/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProfessionals((prev) => prev.filter((p) => p.id !== id));
        setTrials((prev) => prev.filter((t) => t.professionalId !== id));
      }
    } catch {
      // silently fail
    }
  };

  /* ─── Trial CRUD ─── */

  const openAddTrial = () => {
    setEditingTrial(null);
    setTrialForm({
      ...defaultTrialForm,
      professionalId: professionals[0]?.id || "",
    });
    setModalType("trial");
  };

  const openEditTrial = (trial: BeautyTrial) => {
    setEditingTrial(trial);
    setTrialForm({
      professionalId: trial.professionalId,
      date: formatDateForInput(trial.date),
      location: trial.location || "",
      notes: trial.notes || "",
      outcome: trial.outcome || "Scheduled",
    });
    setModalType("trial");
  };

  const handleTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      professionalId: trialForm.professionalId,
      date: trialForm.date,
      location: trialForm.location || null,
      notes: trialForm.notes || null,
      outcome: trialForm.outcome || null,
    };
    try {
      const url = editingTrial
        ? `/api/beauty/trials/${editingTrial.id}`
        : "/api/beauty/trials";
      const method = editingTrial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchAll();
        setModalType(null);
        setEditingTrial(null);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const deleteTrial = async (id: string) => {
    if (!confirm("Delete this trial/appointment?")) return;
    try {
      const res = await fetch(`/api/beauty/trials/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTrials((prev) => prev.filter((t) => t.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  /* ─── Inspiration CRUD ─── */

  const openAddInspiration = () => {
    setInspForm(defaultInspirationForm);
    setModalType("inspiration");
  };

  const handleInspSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspForm.imageUrl) return;
    setSaving(true);
    const payload = {
      imageUrl: inspForm.imageUrl,
      caption: inspForm.caption || null,
    };
    try {
      const res = await fetch("/api/beauty/inspiration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchAll();
        setModalType(null);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const deleteInspiration = async (id: string) => {
    if (!confirm("Delete this inspiration photo?")) return;
    try {
      const res = await fetch(`/api/beauty/inspiration/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInspiration((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  /* ─── Render ─── */

  if (loading) return <BeautySkeleton />;

  const muas = professionals.filter((p) => p.type === "MUA");
  const hairstylists = professionals.filter((p) => p.type === "HAIRSTYLIST");

  return (
    <div
      className="space-y-8 transition-opacity duration-500 ease-out"
      style={{ opacity: loading ? 0 : 1 }}
    >
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Your Beauty Plan
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant font-label">
            Add your makeup artist, hairstylist, inspiration looks, and quotes
            here.
          </p>
        </div>
      </div>

      {/* ─── Professionals ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Makeup Artists */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Icon name="brush" className="text-2xl text-primary" />
            <h2 className="font-headline text-xl text-on-surface">
              Makeup Artists
            </h2>
          </div>

          {muas.length > 0 ? (
            <div className="space-y-3">
              {muas.map((mua) => (
                <ProfessionalCard
                  key={mua.id}
                  professional={mua}
                  onEdit={() => openEditProfessional(mua)}
                  onDelete={() => deleteProfessional(mua.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant/60 font-label">
              No makeup artists added yet.
            </p>
          )}

          <button
            onClick={() => openAddProfessional("MUA")}
            className="w-full py-2.5 rounded-xl border border-dashed border-outline-variant/40 text-sm font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="add" className="text-lg" />
            Add Makeup Artist
          </button>
        </div>

        {/* Hairstylists */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Icon name="content_cut" className="text-2xl text-primary" />
            <h2 className="font-headline text-xl text-on-surface">
              Hairstylists
            </h2>
          </div>

          {hairstylists.length > 0 ? (
            <div className="space-y-3">
              {hairstylists.map((hs) => (
                <ProfessionalCard
                  key={hs.id}
                  professional={hs}
                  onEdit={() => openEditProfessional(hs)}
                  onDelete={() => deleteProfessional(hs.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant/60 font-label">
              No hairstylists added yet.
            </p>
          )}

          <button
            onClick={() => openAddProfessional("HAIRSTYLIST")}
            className="w-full py-2.5 rounded-xl border border-dashed border-outline-variant/40 text-sm font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="add" className="text-lg" />
            Add Hairstylist
          </button>
        </div>
      </div>

      {/* ─── Inspiration Gallery ─── */}
      <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="auto_awesome" className="text-2xl text-primary" />
            <h2 className="font-headline text-xl text-on-surface">
              Inspiration Gallery
            </h2>
          </div>
          <button
            onClick={openAddInspiration}
            className="gold-gradient text-white px-4 py-2 rounded-full font-label text-xs font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="add" className="text-sm" />
            Add Photo
          </button>
        </div>

        {inspiration.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {inspiration.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-xl overflow-hidden ghost-border"
              >
                <div
                  className="w-full h-full bg-gradient-to-br from-rose-200 via-pink-100 to-amber-100"
                  style={{
                    backgroundImage: `url(${item.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                {/* Always-visible delete on mobile (no hover available) */}
                <button
                  onClick={() => deleteInspiration(item.id)}
                  aria-label="Delete inspiration"
                  className="sm:hidden absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-on-surface-variant shadow-md active:scale-95 transition-transform cursor-pointer"
                >
                  <Icon name="delete" className="text-sm" />
                </button>
                {/* Hover overlay (desktop only) */}
                <div className="hidden sm:flex absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all items-end justify-between p-2.5 opacity-0 group-hover:opacity-100">
                  {item.caption && (
                    <span className="text-white text-xs font-label truncate max-w-[70%]">
                      {item.caption}
                    </span>
                  )}
                  <button
                    onClick={() => deleteInspiration(item.id)}
                    aria-label="Delete inspiration"
                    className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors shrink-0 cursor-pointer"
                  >
                    <Icon name="delete" className="text-sm" />
                  </button>
                </div>
              </div>
            ))}
            {/* Empty placeholder slots */}
            {inspiration.length < 4 &&
              Array.from({ length: 4 - inspiration.length }).map((_, i) => (
                <button
                  key={`placeholder-${i}`}
                  onClick={openAddInspiration}
                  className="aspect-square rounded-xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-1 text-on-surface-variant/40 hover:text-primary/60 hover:border-primary/30 transition-all cursor-pointer"
                >
                  <Icon name="add_photo_alternate" className="text-2xl" />
                  <span className="text-xs font-label">Add Photo</span>
                </button>
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={openAddInspiration}
                className="aspect-square rounded-xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-1 text-on-surface-variant/40 hover:text-primary/60 hover:border-primary/30 transition-all cursor-pointer"
              >
                <Icon name="add_photo_alternate" className="text-2xl" />
                <span className="text-xs font-label">Add Photo</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Trials & Appointments ─── */}
      <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="calendar_month" className="text-2xl text-primary" />
            <h2 className="font-headline text-xl text-on-surface">
              Trials &amp; Appointments
            </h2>
          </div>
          {professionals.length > 0 && (
            <button
              onClick={openAddTrial}
              className="gold-gradient text-white px-4 py-2 rounded-full font-label text-xs font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="add" className="text-sm" />
              Add Appointment
            </button>
          )}
        </div>

        {trials.length > 0 ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="text-left py-2.5 pr-4 font-label font-semibold text-xs uppercase tracking-wider text-on-surface-variant">
                    Date
                  </th>
                  <th className="text-left py-2.5 pr-4 font-label font-semibold text-xs uppercase tracking-wider text-on-surface-variant">
                    Artist
                  </th>
                  <th className="text-left py-2.5 pr-4 font-label font-semibold text-xs uppercase tracking-wider text-on-surface-variant hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-left py-2.5 pr-4 font-label font-semibold text-xs uppercase tracking-wider text-on-surface-variant">
                    Status
                  </th>
                  <th className="py-2.5 font-label font-semibold text-xs uppercase tracking-wider text-on-surface-variant w-20">
                  </th>
                </tr>
              </thead>
              <tbody>
                {trials.map((trial) => (
                  <tr
                    key={trial.id}
                    className="border-b border-outline-variant/10 last:border-0"
                  >
                    <td className="py-3 pr-4 font-label text-on-surface">
                      {formatDate(trial.date)}
                    </td>
                    <td className="py-3 pr-4 font-label text-on-surface">
                      {trial.professional?.name || "Unknown"}
                    </td>
                    <td className="py-3 pr-4 font-label text-on-surface-variant hidden sm:table-cell">
                      {trial.professional?.type === "MUA"
                        ? "Makeup"
                        : "Hair"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-label font-medium ${outcomeColor(trial.outcome)}`}
                      >
                        {trial.outcome || "Scheduled"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEditTrial(trial)}
                          className="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer"
                        >
                          <Icon name="edit" className="text-sm" />
                        </button>
                        <button
                          onClick={() => deleteTrial(trial.id)}
                          className="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-error transition-colors cursor-pointer"
                        >
                          <Icon name="delete" className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Icon name="event_busy" className="text-3xl text-primary/30 mb-2" />
            <p className="text-sm text-on-surface-variant/60 font-label">
              {professionals.length === 0
                ? "Add a professional first, then schedule trials."
                : "No trials or appointments yet. Schedule your first one!"}
            </p>
          </div>
        )}
      </div>

      {/* ─── Notes ─── */}
      <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Icon name="sticky_note_2" className="text-2xl text-primary" />
          <h2 className="font-headline text-xl text-on-surface">
            Beauty Notes
          </h2>
        </div>

        {/* Add Note */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            className="flex-1 bg-surface-container-low rounded-xl py-2.5 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button
            onClick={handleAddNote}
            disabled={savingNote || !newNote.trim()}
            className="px-5 py-2.5 rounded-xl gold-gradient text-white text-sm font-label font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer"
          >
            Save
          </button>
        </div>

        {/* Notes List */}
        {beautyNotes.length > 0 ? (
          <div className="space-y-2">
            {beautyNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low/50 ghost-border group"
              >
                {editingNoteId === note.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleUpdateNote(note.id);
                        }
                        if (e.key === "Escape") {
                          setEditingNoteId(null);
                          setEditingNoteContent("");
                        }
                      }}
                      autoFocus
                      className="flex-1 bg-surface-container-low rounded-lg py-1.5 px-3 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={savingNote || !editingNoteContent.trim()}
                      className="px-3 py-1.5 rounded-lg gold-gradient text-white text-xs font-label font-medium hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingNoteId(null);
                        setEditingNoteContent("");
                      }}
                      className="px-3 py-1.5 rounded-lg border border-outline-variant/40 text-xs font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="flex-1 text-sm text-on-surface font-label leading-relaxed">
                      {note.content}
                    </p>
                    <span className="text-xs text-on-surface-variant/50 font-label shrink-0 pt-0.5">
                      {formatDate(note.createdAt)}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditingNote(note)}
                        className="p-1 rounded-lg text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Icon name="edit" className="text-sm" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 rounded-lg text-on-surface-variant/50 hover:text-error transition-colors cursor-pointer"
                      >
                        <Icon name="delete" className="text-sm" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Icon name="sticky_note_2" className="text-3xl text-primary/30 mb-2 block" />
            <p className="text-sm text-on-surface-variant/60 font-label">
              No notes yet. Add your first beauty note above.
            </p>
          </div>
        )}
      </div>

      {/* ═══════ MODALS ═══════ */}

      {/* ─── Professional Modal ─── */}
      {modalType === "professional" && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingProfessional
                ? `Edit ${profForm.type === "MUA" ? "Makeup Artist" : "Hairstylist"}`
                : `Add ${profForm.type === "MUA" ? "Makeup Artist" : "Hairstylist"}`}
            </h2>
            <form onSubmit={handleProfSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={profForm.name}
                  onChange={(e) =>
                    setProfForm({ ...profForm, name: e.target.value })
                  }
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Sarah's MUA Studio"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profForm.phone}
                    onChange={(e) =>
                      setProfForm({ ...profForm, phone: e.target.value })
                    }
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="07..."
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profForm.email}
                    onChange={(e) =>
                      setProfForm({ ...profForm, email: e.target.value })
                    }
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={profForm.instagram}
                    onChange={(e) =>
                      setProfForm({ ...profForm, instagram: e.target.value })
                    }
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="@handle"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={profForm.cost}
                    onChange={(e) =>
                      setProfForm({ ...profForm, cost: e.target.value })
                    }
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Website
                </label>
                <input
                  type="url"
                  value={profForm.website}
                  onChange={(e) =>
                    setProfForm({ ...profForm, website: e.target.value })
                  }
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Notes
                </label>
                <textarea
                  value={profForm.notes}
                  onChange={(e) =>
                    setProfForm({ ...profForm, notes: e.target.value })
                  }
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  rows={2}
                  placeholder="Any notes..."
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving
                    ? "Saving..."
                    : editingProfessional
                      ? "Update"
                      : "Add Professional"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalType(null);
                    setEditingProfessional(null);
                  }}
                  className="px-6 py-3 rounded-full border border-outline-variant/40 text-sm font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Trial Modal ─── */}
      {modalType === "trial" && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingTrial ? "Edit Appointment" : "Add Appointment"}
            </h2>
            <form onSubmit={handleTrialSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Professional *
                </label>
                <select
                  required
                  value={trialForm.professionalId}
                  onChange={(e) =>
                    setTrialForm({
                      ...trialForm,
                      professionalId: e.target.value,
                    })
                  }
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Select a professional</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type === "MUA" ? "Makeup" : "Hair"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={trialForm.date}
                    onChange={(e) =>
                      setTrialForm({ ...trialForm, date: e.target.value })
                    }
                    min={trialForm.outcome === "Completed" || trialForm.outcome === "Cancelled" ? undefined : new Date().toISOString().split("T")[0]}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Status
                  </label>
                  <select
                    value={trialForm.outcome}
                    onChange={(e) =>
                      setTrialForm({ ...trialForm, outcome: e.target.value })
                    }
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Location
                </label>
                <input
                  type="text"
                  value={trialForm.location}
                  onChange={(e) =>
                    setTrialForm({ ...trialForm, location: e.target.value })
                  }
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Their studio, your home..."
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Notes
                </label>
                <textarea
                  value={trialForm.notes}
                  onChange={(e) =>
                    setTrialForm({ ...trialForm, notes: e.target.value })
                  }
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  rows={2}
                  placeholder="Any notes about this appointment..."
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving
                    ? "Saving..."
                    : editingTrial
                      ? "Update"
                      : "Add Appointment"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalType(null);
                    setEditingTrial(null);
                  }}
                  className="px-6 py-3 rounded-full border border-outline-variant/40 text-sm font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Inspiration Modal ─── */}
      {modalType === "inspiration" && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              Add Inspiration Photo
            </h2>
            <form onSubmit={handleInspSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Image *
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <ImageUpload
                    currentUrl={inspForm.imageUrl || undefined}
                    onUpload={(url) => setInspForm({ ...inspForm, imageUrl: url })}
                    label="Upload Photo"
                  />
                  <span className="text-xs text-on-surface-variant/50 font-label self-center hidden sm:block">or</span>
                  <div className="flex-1 w-full">
                    <input
                      type="url"
                      value={inspForm.imageUrl}
                      onChange={(e) =>
                        setInspForm({ ...inspForm, imageUrl: e.target.value })
                      }
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="https://..."
                    />
                    <p className="mt-1.5 text-xs text-on-surface-variant/60 font-label">
                      Upload a photo or paste a URL from any website.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Caption
                </label>
                <input
                  type="text"
                  value={inspForm.caption}
                  onChange={(e) =>
                    setInspForm({ ...inspForm, caption: e.target.value })
                  }
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Bridal updo inspo"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || !inspForm.imageUrl}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? "Saving..." : "Add Photo"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-6 py-3 rounded-full border border-outline-variant/40 text-sm font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Professional Card Component ─── */

function ProfessionalCard({
  professional,
  onEdit,
  onDelete,
}: {
  professional: BeautyProfessional;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-surface-container-low rounded-xl p-4 ghost-border space-y-2 group">
      <div className="flex items-start justify-between">
        <h3 className="font-label font-semibold text-sm text-on-surface">
          {professional.name}
        </h3>
        {professional.cost && (
          <span className="text-xs font-label font-medium text-primary shrink-0 ml-2">
            {formatCost(professional.cost)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant/70 font-label">
        {professional.phone && (
          <span className="flex items-center gap-1">
            <Icon name="call" className="text-xs" />
            {professional.phone}
          </span>
        )}
        {professional.email && (
          <span className="flex items-center gap-1">
            <Icon name="mail" className="text-xs" />
            {professional.email}
          </span>
        )}
        {professional.instagram && (
          <span className="flex items-center gap-1">
            <Icon name="photo_camera" className="text-xs" />
            {professional.instagram}
          </span>
        )}
      </div>

      {professional.notes && (
        <p className="text-xs text-on-surface-variant/60 leading-relaxed">
          {professional.notes}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onEdit}
          className="flex-1 py-1.5 rounded-xl border border-outline-variant/40 text-xs font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="py-1.5 px-3 rounded-xl border border-outline-variant/40 text-on-surface-variant/50 hover:text-error hover:border-error/30 transition-all cursor-pointer"
        >
          <Icon name="delete" className="text-sm" />
        </button>
      </div>
    </div>
  );
}
