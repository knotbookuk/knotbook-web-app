"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface TimelineEvent {
  id: string;
  name: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  address: string | null;
  dayLabel: string | null;
  sortOrder: number;
}

const defaultFormData = {
  name: "",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  venue: "",
  dayLabel: "",
};

const eventIcons: Record<string, string> = {
  Mehndi: "palette",
  Nikah: "favorite",
  Walima: "celebration",
  Baraat: "music_note",
  Reception: "nightlife",
  Brunch: "restaurant",
  Sangeet: "music_note",
  Haldi: "spa",
};

function getEventIcon(name: string): string {
  for (const [key, icon] of Object.entries(eventIcons)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "event";
}

/* ─── Skeleton ─── */
function TimelineSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-12 w-56 bg-surface-container rounded-xl" />
          <div className="mt-2 h-4 w-72 bg-surface-container rounded-lg" />
        </div>
        <div className="h-12 w-36 bg-surface-container rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-surface-container-low rounded-2xl" />
        ))}
      </div>
      <div className="pl-12 space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-44 bg-surface-container-low rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch {
      // silently fail
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setFormData(defaultFormData);
    setModalOpen(true);
  };

  const openEditModal = (event: TimelineEvent) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || "",
      date: event.date ? event.date.split("T")[0] : "",
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      venue: event.venue || "",
      dayLabel: event.dayLabel || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.date) return;
    setSaving(true);

    const payload = {
      name: formData.name,
      description: formData.description || null,
      date: formData.date,
      startTime: formData.startTime || null,
      endTime: formData.endTime || null,
      venue: formData.venue || null,
      dayLabel: formData.dayLabel || null,
    };

    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
      const method = editingEvent ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchEvents();
        setModalOpen(false);
        setFormData(defaultFormData);
        setEditingEvent(null);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  if (loading) return <TimelineSkeleton />;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const uniqueDays = [...new Set(events.map((e) => e.dayLabel).filter(Boolean))];
  const uniqueVenues = [...new Set(events.map((e) => e.venue).filter(Boolean))];

  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
              Wedding Week
            </h1>
            <p className="mt-1 text-on-surface-variant text-sm font-label">
              Your complete wedding celebration schedule
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full gold-gradient text-white text-xs font-label font-medium shadow-md">
            {events.length} Events
          </span>
        </div>
        <button
          onClick={openAddModal}
          className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon name="add" className="text-lg" />
          Add Event
        </button>
      </div>

      {/* ─── Overview Cards ─── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border text-center">
          <p className="font-headline text-3xl text-primary">{uniqueDays.length || events.length}</p>
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
            Days
          </p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border text-center">
          <p className="font-headline text-3xl text-on-surface">{events.length}</p>
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
            Events
          </p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border text-center">
          <p className="font-headline text-3xl text-on-surface">{uniqueVenues.length}</p>
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
            Venues
          </p>
        </div>
      </div>

      {/* ─── Vertical Timeline ─── */}
      {events.length === 0 ? (
        <div className="text-center py-20">
          <Icon name="timeline" className="text-5xl text-primary/20" />
          <p className="mt-4 text-on-surface-variant/50 font-label text-sm">
            No events yet. Add your first event to build your timeline!
          </p>
        </div>
      ) : (
        <div className="relative pl-8 md:pl-12">
          {/* Gold vertical line */}
          <div className="absolute left-[15px] md:left-[23px] top-4 bottom-4 w-[2px] gold-gradient rounded-full" />

          <div className="space-y-8">
            {events.map((event) => {
              const isExpanded = expandedId === event.id;
              const isPast = new Date(event.date) < new Date();

              return (
                <div key={event.id} className="relative">
                  {/* Circle node */}
                  <div className="absolute -left-8 md:-left-12 top-6 w-8 h-8 rounded-full gold-gradient flex items-center justify-center shadow-md z-10">
                    <Icon name={getEventIcon(event.name)} className="text-white text-sm" />
                  </div>

                  {/* Event Card */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : event.id)
                    }
                    className={`w-full text-left bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border hover:shadow-lg transition-all cursor-pointer ${
                      isExpanded ? "ring-2 ring-primary/15" : ""
                    }`}
                  >
                    {/* Day badge + status */}
                    <div className="flex items-center justify-between mb-3">
                      {event.dayLabel && (
                        <span className="px-3 py-1 rounded-full bg-primary-container/15 text-primary text-[11px] font-label font-semibold tracking-wide">
                          {event.dayLabel}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isPast ? "bg-secondary" : "bg-outline-variant"
                          }`}
                        />
                        <span
                          className={`text-[11px] font-label font-medium ${
                            isPast
                              ? "text-secondary"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {isPast ? "Completed" : "Upcoming"}
                        </span>
                      </div>
                    </div>

                    {/* Event name */}
                    <h3 className="font-headline text-2xl text-on-surface mb-2">
                      {event.name}
                    </h3>

                    {/* Date & time */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-on-surface-variant font-label">
                      <div className="flex items-center gap-1.5">
                        <Icon name="calendar_today" className="text-sm text-primary/50" />
                        {formatDate(event.date)}
                      </div>
                      {(event.startTime || event.endTime) && (
                        <div className="flex items-center gap-1.5">
                          <Icon name="schedule" className="text-sm text-primary/50" />
                          {event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}
                        </div>
                      )}
                    </div>

                    {/* Venue */}
                    {event.venue && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm text-on-surface-variant font-label">
                        <Icon name="location_on" className="text-sm text-primary/50" />
                        {event.venue}
                      </div>
                    )}

                    {/* Expanded description */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-outline-variant/30">
                        {event.description && (
                          <p className="text-sm text-on-surface-variant leading-relaxed font-label">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-4">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(event);
                            }}
                            className="px-4 py-2 rounded-xl border border-outline-variant/40 text-xs font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                          >
                            Edit Event
                          </span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(event.id);
                            }}
                            className="px-4 py-2 rounded-xl border border-outline-variant/40 text-xs font-label text-on-surface-variant/50 hover:text-error hover:border-error/30 transition-all cursor-pointer"
                          >
                            Delete
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Expand indicator */}
                    <div className="flex justify-center mt-3">
                      <Icon name={isExpanded ? "expand_less" : "expand_more"} className="text-on-surface-variant/30 text-sm transition-transform" />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Add/Edit Event Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingEvent ? "Edit Event" : "Add New Event"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Mehndi Celebration"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  rows={3}
                  placeholder="Event details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Day Label
                  </label>
                  <input
                    type="text"
                    value={formData.dayLabel}
                    onChange={(e) => setFormData({ ...formData, dayLabel: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. Day 1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. 4:00 PM"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. 10:00 PM"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Venue
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. The Grand Hall, Mayfair"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? "Saving..." : editingEvent ? "Update Event" : "Add Event"}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingEvent(null); }}
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
