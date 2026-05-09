"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  sortOrder: number;
}

const categoryFilters = ["Ceremony", "Reception", "Attire", "Stationery", "Logistics"];
const priorityFilters = ["Urgent", "High", "Medium", "Low"];

/* ─── Dropdown Filter Component ─── */

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeCount = selected.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-label font-medium transition-all cursor-pointer ${
          activeCount > 0
            ? "gold-gradient text-white shadow-md"
            : "bg-surface-container-lowest ghost-border text-on-surface-variant hover:border-primary/30 hover:text-on-surface"
        }`}
      >
        {label}
        {activeCount > 0 && (
          <span className="bg-white/25 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <Icon name={open ? "expand_less" : "expand_more"} className="text-base" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-surface-container-lowest rounded-xl ghost-border ambient-shadow p-3 min-w-[180px] z-30">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <span
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                  selected.includes(opt)
                    ? "border-primary bg-primary"
                    : "border-outline-variant"
                }`}
              >
                {selected.includes(opt) && (
                  <Icon name="check" className="text-on-primary text-[10px]" />
                )}
              </span>
              <span className="text-sm text-on-surface font-body">{opt}</span>
            </button>
          ))}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => options.forEach((o) => { if (selected.includes(o)) onToggle(o); })}
              className="w-full text-center text-xs text-primary font-label font-medium mt-2 pt-2 border-t border-outline-variant/20 cursor-pointer hover:text-primary/70 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Doughnut Chart ─── */

function DoughnutChart({ percentage }: { percentage: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = (percentage / 100) * circumference;
  const remaining = circumference - filled;

  return (
    <svg viewBox="0 0 128 128" className="w-32 h-32 mx-auto">
      <defs>
        <linearGradient id="doughnutGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#735c00" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" className="text-surface-container" strokeWidth="14" />
      <circle cx="64" cy="64" r={radius} fill="none" stroke="url(#doughnutGold)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${filled} ${remaining}`} strokeDashoffset={circumference * 0.25} className="transition-all duration-700" />
      <text x="64" y="60" textAnchor="middle" className="fill-on-surface font-headline" fontSize="22" fontWeight="600">{percentage}%</text>
      <text x="64" y="78" textAnchor="middle" className="fill-on-surface-variant" fontSize="10">complete</text>
    </svg>
  );
}

/* ─── Skeleton Loader ─── */
function ChecklistSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="h-12 w-72 bg-surface-container rounded-xl" />
          <div className="mt-3 h-4 w-56 bg-surface-container rounded-lg" />
        </div>
        <div className="w-full md:w-64">
          <div className="h-3 w-full bg-surface-container rounded-full" />
        </div>
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        <div className="lg:col-span-7 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-surface-container-low rounded-2xl" />
          ))}
        </div>
        <div className="lg:col-span-3 space-y-6">
          <div className="h-64 bg-surface-container-low rounded-3xl" />
        </div>
      </section>
    </div>
  );
}

/* ─── Page ─── */

export default function ChecklistsPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "",
    dueDate: "",
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/checklists");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {
      // silently fail
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  };

  const toggleCompletion = async (item: ChecklistItem) => {
    const newCompleted = !item.isCompleted;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isCompleted: newCompleted } : i));
    try {
      const res = await fetch(`/api/checklists/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: newCompleted }),
      });
      if (!res.ok) {
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isCompleted: item.isCompleted } : i));
      }
    } catch {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isCompleted: item.isCompleted } : i));
    }
  };

  const deleteItem = async (id: string) => {
    setDeletingId(id);
    const prev = items;
    setItems((curr) => curr.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/checklists/${id}`, { method: "DELETE" });
      if (!res.ok) setItems(prev);
    } catch {
      setItems(prev);
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description ?? "",
      category: item.category ?? "",
      priority: item.priority ?? "",
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "",
    });
    setModalOpen(true);
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formData.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/checklists/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          category: formData.category || null,
          priority: formData.priority || null,
          dueDate: formData.dueDate || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
        closeModal();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormData({ title: "", description: "", category: "", priority: "", dueDate: "" });
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ title: "", description: "", category: "", priority: "", dueDate: "" });
    setModalOpen(true);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          category: formData.category || null,
          priority: formData.priority || null,
          dueDate: formData.dueDate || null,
        }),
      });
      if (res.ok) {
        const newItem = await res.json();
        setItems((prev) => [...prev, newItem]);
        closeModal();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const toggleFilter = (
    value: string,
    selected: string[],
    setter: (v: string[]) => void
  ) => {
    setter(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  if (loading) return <ChecklistSkeleton />;

  const filteredItems = items.filter((item) => {
    if (selectedCategories.length > 0 && item.category && !selectedCategories.includes(item.category)) return false;
    if (selectedPriorities.length > 0 && item.priority && !selectedPriorities.includes(item.priority)) return false;
    return true;
  });

  const completedItems = filteredItems.filter((i) => i.isCompleted);
  const upcomingItems = filteredItems
    .filter((i) => !i.isCompleted)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  const total = items.length;
  const completedCount = items.filter((i) => i.isCompleted).length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const hasActiveFilters = selectedCategories.length > 0 || selectedPriorities.length > 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* ─── Header Section ─── */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="font-headline text-4xl md:text-6xl text-on-surface leading-tight">
              The Master List
            </h1>
            <p className="mt-2 italic text-on-surface-variant/70 font-body text-base">
              Every detail, every moment — beautifully organised.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer self-start"
          >
            <Icon name="add" className="text-lg" />
            Add Task
          </button>
        </div>

        <div className="w-full md:w-64 md:ml-auto">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-on-surface-variant font-label">
              <span className="font-semibold text-on-surface">{completedCount}</span> of {total} tasks
            </span>
            <span className="text-sm font-semibold text-primary font-label">{percentage}%</span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
            <div className="gold-gradient h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%` }} />
          </div>
        </div>
      </section>

      {/* ─── Main Layout ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* ─── Left Column (tasks) ─── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Completed Milestones */}
          {completedItems.length > 0 && (
            <div>
              <h2 className="font-headline text-2xl text-on-surface mb-4">
                Completed Milestones
              </h2>
              <div className="space-y-3">
                {completedItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 bg-surface-container-low rounded-2xl px-5 py-4 ghost-border opacity-70 group transition-all hover:opacity-90"
                  >
                    <button
                      onClick={() => toggleCompletion(item)}
                      className="cursor-pointer shrink-0"
                    >
                      <Icon name="check_circle" className="text-primary text-2xl" />
                    </button>
                    <span className="flex-1 text-on-surface font-body line-through decoration-primary/40">
                      {item.title}
                    </span>
                    <span className="text-xs text-on-surface-variant/60 font-label">
                      {formatDate(item.completedAt)}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      disabled={deletingId === item.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant/40 hover:text-error cursor-pointer shrink-0"
                      title="Delete"
                    >
                      <Icon name="delete" className="text-lg" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter bar + Upcoming heading */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-headline text-2xl text-on-surface">
              Upcoming Priorities
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown
                label="Category"
                options={categoryFilters}
                selected={selectedCategories}
                onToggle={(v) => toggleFilter(v, selectedCategories, setSelectedCategories)}
              />
              <FilterDropdown
                label="Priority"
                options={priorityFilters}
                selected={selectedPriorities}
                onToggle={(v) => toggleFilter(v, selectedPriorities, setSelectedPriorities)}
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => { setSelectedCategories([]); setSelectedPriorities([]); }}
                  className="text-xs text-primary font-label font-medium hover:text-primary/70 transition-colors cursor-pointer px-2 py-1"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Task list */}
          {upcomingItems.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="task_alt" className="text-5xl text-primary/20" />
              <p className="mt-3 text-on-surface-variant/50 font-label text-sm">
                {hasActiveFilters ? "No tasks match your filters." : "All tasks completed! Add more to stay on track."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 bg-surface-container-lowest rounded-2xl px-5 py-5 ambient-shadow ghost-border group transition-all hover:border-primary-container"
                  onMouseEnter={() => setHoveredTask(item.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                >
                  {/* Check circle */}
                  <button
                    onClick={() => toggleCompletion(item)}
                    className="cursor-pointer shrink-0 mt-0.5"
                  >
                    <Icon name={hoveredTask === item.id ? "check_circle" : "circle"} className="text-2xl transition-all text-outline-variant group-hover:text-primary" />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-headline text-lg text-on-surface">{item.title}</span>
                      {item.category && (
                        <span className="bg-primary-container/15 text-primary text-[10px] font-label font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          {item.category}
                        </span>
                      )}
                      {item.priority && (
                        <span className={`text-[10px] font-label font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          item.priority === "Urgent" ? "bg-error/10 text-error" :
                          item.priority === "High" ? "bg-tertiary-container/20 text-tertiary" :
                          "bg-surface-container text-on-surface-variant"
                        }`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{item.description}</p>
                    )}
                    {item.dueDate && (
                      <p className="text-xs text-on-surface-variant/60 font-label mt-2 flex items-center gap-1">
                        <Icon name="calendar_today" className="text-sm" />
                        {formatDate(item.dueDate)}
                      </p>
                    )}
                  </div>

                  {/* Edit & Delete buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                      className="text-on-surface-variant/40 hover:text-primary cursor-pointer p-1 rounded-lg hover:bg-primary/5 transition-all"
                      title="Edit"
                    >
                      <Icon name="edit" className="text-lg" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                      disabled={deletingId === item.id}
                      className="text-on-surface-variant/40 hover:text-error cursor-pointer p-1 rounded-lg hover:bg-error/5 transition-all"
                      title="Delete"
                    >
                      <Icon name="delete" className="text-lg" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Right Column (stats only) ─── */}
        <div className="lg:col-span-3">
          <div className="bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border">
            <h3 className="font-headline text-xl text-on-surface mb-5">Task Breakdown</h3>
            <DoughnutChart percentage={percentage} />
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-surface-container-low rounded-xl p-3 text-center">
                <p className="font-headline text-2xl text-primary">{completedCount}</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-label mt-0.5">Completed</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 text-center">
                <p className="font-headline text-2xl text-on-surface">{total - completedCount}</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-label mt-0.5">Remaining</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Add / Edit Task Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingItem ? "Edit Task" : "Add New Task"}
            </h2>
            <form onSubmit={editingItem ? handleEditItem : handleAddItem} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Book florist"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  rows={3}
                  placeholder="Optional details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <option value="">Select...</option>
                    {categoryFilters.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <option value="">Select...</option>
                    {priorityFilters.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  min={editingItem?.isCompleted ? undefined : new Date().toISOString().split("T")[0]}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Save Changes" : "Add Task"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
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
