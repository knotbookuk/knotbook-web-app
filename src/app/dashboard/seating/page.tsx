"use client";

import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface TableGuest {
  id: string;
  name: string;
  familySide: string;
  rsvpStatus: string;
  mealPreference: string | null;
}

interface SeatingTable {
  id: string;
  name: string;
  capacity: number;
  shape: string;
  positionX: number | null;
  positionY: number | null;
  guests: TableGuest[];
  _count: { guests: number };
}

interface UnassignedGuest {
  id: string;
  name: string;
  tableId: string | null;
  familySide?: string;
  rsvpStatus?: string;
  plusOnes?: number;
}

type RsvpFilter = "ALL" | "ATTENDING" | "NO_RESPONSE" | "NOT_COMING";
type SideFilter = "ALL" | "BRIDE" | "GROOM" | "MUTUAL";
type TableSide = "BRIDE" | "GROOM" | "MUTUAL" | "NONE";

const defaultFormData = {
  name: "",
  capacity: "10",
  shape: "ROUND" as "ROUND" | "RECTANGULAR",
};

// TODO: migrate per-table designated side from localStorage to a DB column
// (e.g. SeatingTable.designatedSide enum). Using localStorage in v1 because
// table IDs are globally unique cuids so cross-wedding collisions are not a
// concern, and the schema doesn't have a column for this yet.
const TABLE_SIDE_STORAGE_PREFIX = "knotbook:seating-table-side:";

function getStoredTableSide(tableId: string): TableSide {
  if (typeof window === "undefined") return "NONE";
  try {
    const v = window.localStorage.getItem(TABLE_SIDE_STORAGE_PREFIX + tableId);
    if (v === "BRIDE" || v === "GROOM" || v === "MUTUAL" || v === "NONE") {
      return v;
    }
  } catch {
    // ignore
  }
  return "NONE";
}

function setStoredTableSide(tableId: string, side: TableSide) {
  if (typeof window === "undefined") return;
  try {
    if (side === "NONE") {
      window.localStorage.removeItem(TABLE_SIDE_STORAGE_PREFIX + tableId);
    } else {
      window.localStorage.setItem(TABLE_SIDE_STORAGE_PREFIX + tableId, side);
    }
  } catch {
    // ignore
  }
}

function getSurname(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "—";
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1];
}

function getSideLetter(side?: string): string {
  if (side === "BRIDE") return "B";
  if (side === "GROOM") return "G";
  return "M";
}

function getSideClass(side?: string): string {
  if (side === "BRIDE") return "bg-pink-500/15 text-pink-600";
  if (side === "GROOM") return "bg-blue-500/15 text-blue-600";
  return "bg-outline-variant/20 text-on-surface-variant";
}

function getRsvpDotClass(status?: string): string {
  if (status === "ATTENDING") return "bg-green-500";
  if (status === "NO_RESPONSE") return "bg-amber-500";
  if (status === "NOT_COMING") return "bg-red-500";
  return "bg-outline-variant/40";
}

function getRsvpDotTitle(status?: string): string {
  if (status === "ATTENDING") return "Attending";
  if (status === "NO_RESPONSE") return "No response";
  if (status === "NOT_COMING") return "Not coming";
  return "Unknown";
}

function getTableStatus(table: SeatingTable): "full" | "available" | "empty" {
  if (table.guests.length === 0) return "empty";
  if (table.guests.length >= table.capacity) return "full";
  return "available";
}

function getStatusRingClass(status: "full" | "available" | "empty"): string {
  switch (status) {
    case "full":
      return "ring-2 ring-green-500";
    case "available":
      return "ring-2 ring-primary";
    case "empty":
      return "ring-2 ring-outline-variant/30";
  }
}

function getStatusLabel(status: "full" | "available" | "empty"): string {
  switch (status) {
    case "full":
      return "Full";
    case "available":
      return "Available";
    case "empty":
      return "Empty";
  }
}

function getStatusDotClass(status: "full" | "available" | "empty"): string {
  switch (status) {
    case "full":
      return "bg-green-500";
    case "available":
      return "bg-primary";
    case "empty":
      return "bg-outline-variant/40";
  }
}

function getBarColorClass(status: "full" | "available" | "empty"): string {
  switch (status) {
    case "full":
      return "bg-green-500";
    case "available":
      return "bg-primary";
    case "empty":
      return "bg-outline-variant/30";
  }
}

/* ─── Skeleton ─── */
function SeatingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-12 w-64 bg-surface-container rounded-xl" />
          <div className="mt-2 h-4 w-56 bg-surface-container rounded-lg" />
        </div>
        <div className="h-12 w-36 bg-surface-container rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-wrap gap-6 justify-center">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className={`bg-surface-container-low ring-2 ring-surface-container ${i % 2 === 0 ? "w-56 h-36 rounded-2xl" : "w-44 h-44 rounded-full"}`} />
          ))}
        </div>
        <div className="lg:col-span-4">
          <div className="h-96 bg-surface-container-low rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable guest row (badges + checkbox) ─── */
function GuestRow({
  guest,
  selected,
  disabled,
  onToggle,
  compact = false,
}: {
  guest: UnassignedGuest;
  selected: boolean;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
  compact?: boolean;
}) {
  const sideLetter = getSideLetter(guest.familySide);
  const sideClass = getSideClass(guest.familySide);
  const rsvpDot = getRsvpDotClass(guest.rsvpStatus);
  const rsvpTitle = getRsvpDotTitle(guest.rsvpStatus);
  const plusOnes = guest.plusOnes ?? 0;

  return (
    <label
      className={`flex items-center gap-2.5 ${compact ? "px-2.5 py-1.5 rounded-lg" : "gap-3 p-3 rounded-2xl"} bg-surface-container-low transition-all ${
        disabled ? "opacity-60" : "hover:bg-primary-container/10 cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onToggle(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded accent-primary cursor-pointer disabled:cursor-not-allowed"
      />
      {!compact && (
        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
          <Icon name="person" className="text-sm text-on-surface-variant/60" />
        </div>
      )}
      <span className={`${compact ? "text-[13px]" : "text-sm"} font-label text-on-surface flex-1 truncate`}>
        {guest.name}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        {plusOnes > 0 && (
          <span
            className="text-[10px] font-label font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
            title={`${plusOnes} plus-${plusOnes === 1 ? "one" : "ones"}`}
          >
            +{plusOnes}
          </span>
        )}
        <span
          className={`text-[10px] font-label font-semibold w-4 h-4 inline-flex items-center justify-center rounded-full ${sideClass}`}
          title={
            guest.familySide === "BRIDE"
              ? "Bride's side"
              : guest.familySide === "GROOM"
              ? "Groom's side"
              : "Mutual"
          }
        >
          {sideLetter}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${rsvpDot}`}
          title={rsvpTitle}
          aria-label={rsvpTitle}
        />
      </div>
    </label>
  );
}

export default function SeatingPage() {
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<UnassignedGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<SeatingTable | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [guestSearch, setGuestSearch] = useState("");
  const [guestPage, setGuestPage] = useState(0);
  const [assigning, setAssigning] = useState(false);
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>("ATTENDING");
  const [sideFilter, setSideFilter] = useState<SideFilter>("ALL");
  // Manual override: when the user changes side filter explicitly we stop
  // auto-syncing it to the selected table's designated side.
  const [sideFilterManual, setSideFilterManual] = useState(false);
  const [groupBySurname, setGroupBySurname] = useState(false);
  const [collapsedSurnames, setCollapsedSurnames] = useState<Set<string>>(new Set());
  // "comfortable" = avatar + roomy padding; "compact" = no avatar + tighter
  // padding. Compact lets ~50% more guests fit on screen for big lists.
  const [density, setDensity] = useState<"comfortable" | "compact">("compact");
  const [tableSides, setTableSides] = useState<Record<string, TableSide>>({});
  const GUESTS_PER_PAGE = 20;

  useEffect(() => {
    fetchData();
  }, []);

  // Hydrate per-table designated sides from localStorage whenever the
  // tables list changes (so newly-created tables also get an entry).
  useEffect(() => {
    if (tables.length === 0) return;
    const next: Record<string, TableSide> = {};
    for (const t of tables) {
      next[t.id] = getStoredTableSide(t.id);
    }
    setTableSides(next);
  }, [tables]);

  // When the selected table changes (and the user hasn't overridden the side
  // filter manually), auto-apply the designated-side filter for that table.
  useEffect(() => {
    if (sideFilterManual) return;
    if (!selectedTable) return;
    const side = tableSides[selectedTable];
    if (side === "BRIDE" || side === "GROOM" || side === "MUTUAL") {
      setSideFilter(side);
      setGuestPage(0);
    }
  }, [selectedTable, tableSides, sideFilterManual]);

  const fetchData = () => {
    const start = Date.now();
    Promise.all([
      fetch("/api/seating").then((r) => r.json()),
      fetch("/api/guests").then((r) => r.json()),
    ])
      .then(async ([tableData, guestData]) => {
        if (Array.isArray(tableData)) setTables(tableData);
        if (Array.isArray(guestData)) {
          const unassigned = guestData.filter(
            (g: UnassignedGuest) => !g.tableId
          );
          setUnassignedGuests(unassigned);
        }
        const elapsed = Date.now() - start;
        if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
        setLoading(false);
      })
      .catch(async () => {
        const elapsed = Date.now() - start;
        if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
        setLoading(false);
      });
  };

  const openAddModal = () => {
    setEditingTable(null);
    setFormData(defaultFormData);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (table: SeatingTable) => {
    setEditingTable(table);
    setFormData({
      name: table.name,
      capacity: table.capacity.toString(),
      shape: (table.shape === "RECTANGULAR" ? "RECTANGULAR" : "ROUND") as "ROUND" | "RECTANGULAR",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    setFormError(null);

    const newCapacity = parseInt(formData.capacity) || 10;

    // Client-side guard mirrors the server: don't allow shrinking below
    // the current guest count. Caught before the round-trip for instant feedback.
    if (editingTable) {
      const assigned = editingTable.guests.length;
      if (newCapacity < assigned) {
        setFormError(
          `${assigned} guests are already at this table. Reduce to at least ${assigned}, or unassign some first.`
        );
        setSaving(false);
        return;
      }
    }

    const payload = {
      name: formData.name,
      capacity: newCapacity,
      shape: formData.shape,
    };

    try {
      const url = editingTable ? `/api/seating/${editingTable.id}` : "/api/seating";
      const method = editingTable ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        fetchData();
        setModalOpen(false);
        setFormData(defaultFormData);
        setEditingTable(null);
        setFormError(null);
      } else {
        setFormError(data?.error || "Failed to save table.");
      }
    } catch {
      setFormError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm("Are you sure you want to delete this table? All guests will be unassigned.")) return;
    try {
      const res = await fetch(`/api/seating/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        if (selectedTable === id) setSelectedTable(null);
      }
    } catch {
      // silently fail
    }
  };

  const assignGuest = async (guestId: string, tableId: string) => {
    try {
      const res = await fetch(`/api/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch {
      // silently fail
    }
  };

  const unassignGuest = async (guestId: string) => {
    try {
      const res = await fetch(`/api/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: null }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch {
      // silently fail
    }
  };

  const updateTableSide = (tableId: string, side: TableSide) => {
    setStoredTableSide(tableId, side);
    setTableSides((prev) => ({ ...prev, [tableId]: side }));
    // If the user picks a designated side for the currently-selected table
    // and hasn't manually overridden the filter, sync it.
    if (selectedTable === tableId && !sideFilterManual) {
      if (side === "BRIDE" || side === "GROOM" || side === "MUTUAL") {
        setSideFilter(side);
        setGuestPage(0);
      } else {
        setSideFilter("ALL");
        setGuestPage(0);
      }
    }
  };

  // Per-table CSV exports moved to /dashboard/export — single source of
  // truth. See "Tables Summary" and "Seating Plan" cards there.

  const assignMultipleGuests = async (idsOverride?: string[]) => {
    if (!selectedTable) return;
    const table = tables.find((t) => t.id === selectedTable);
    if (!table) return;

    const availableSeats = table.capacity - table.guests.length;
    const sourceIds = idsOverride ?? Array.from(selectedGuests);
    const guestsToAssign = sourceIds.slice(0, availableSeats);
    if (guestsToAssign.length === 0) return;

    setAssigning(true);
    try {
      await Promise.all(
        guestsToAssign.map((guestId) =>
          fetch(`/api/guests/${guestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId: selectedTable }),
          })
        )
      );
      setSelectedGuests(new Set());
      fetchData();
    } catch {
      // silently fail
    } finally {
      setAssigning(false);
    }
  };

  // NOTE: all hooks (including useMemo) MUST run in the same order every
  // render — keep them above any early return like `if (loading) ...`,
  // otherwise React throws "Rendered more hooks than during the previous
  // render" the moment loading flips false.

  const filteredUnassigned = useMemo(() => {
    const q = guestSearch.trim().toLowerCase();
    return unassignedGuests.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q)) return false;
      if (rsvpFilter !== "ALL" && g.rsvpStatus !== rsvpFilter) return false;
      if (sideFilter !== "ALL" && g.familySide !== sideFilter) return false;
      return true;
    });
  }, [unassignedGuests, guestSearch, rsvpFilter, sideFilter]);

  const totalPages = Math.ceil(filteredUnassigned.length / GUESTS_PER_PAGE);
  const paginatedGuests = filteredUnassigned.slice(
    guestPage * GUESTS_PER_PAGE,
    (guestPage + 1) * GUESTS_PER_PAGE
  );

  // Surname grouping for the current page (only used when groupBySurname is on).
  const groupedPage = useMemo(() => {
    const map = new Map<string, UnassignedGuest[]>();
    for (const g of paginatedGuests) {
      const key = getSurname(g.name).toLowerCase();
      const arr = map.get(key);
      if (arr) arr.push(g);
      else map.set(key, [g]);
    }
    return Array.from(map.entries())
      .map(([key, guests]) => ({
        key,
        label: getSurname(guests[0].name),
        guests,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [paginatedGuests]);

  // Bulk-family suggestion: when search yields >=3 results all sharing a
  // surname, surface a one-click "add all" button.
  const bulkFamilySuggestion = useMemo(() => {
    if (!guestSearch.trim()) return null;
    if (filteredUnassigned.length < 3) return null;
    const surnameKey = getSurname(filteredUnassigned[0].name).toLowerCase();
    if (!surnameKey || surnameKey === "—") return null;
    const allSame = filteredUnassigned.every(
      (g) => getSurname(g.name).toLowerCase() === surnameKey
    );
    if (!allSame) return null;
    return {
      surname: getSurname(filteredUnassigned[0].name),
      count: filteredUnassigned.length,
      ids: filteredUnassigned.map((g) => g.id),
    };
  }, [filteredUnassigned, guestSearch]);

  if (loading) return <SeatingSkeleton />;

  const totalAssigned = tables.reduce((sum, t) => sum + t.guests.length, 0);
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

  const selectedTableObj = selectedTable
    ? tables.find((t) => t.id === selectedTable)
    : null;
  const availableSeats = selectedTableObj
    ? selectedTableObj.capacity - selectedTableObj.guests.length
    : 0;

  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Seating Arrangement
          </h1>
          <p className="mt-1 text-on-surface-variant text-sm font-label">
            {tables.length} tables &middot; {totalAssigned} of {totalCapacity}{" "}
            seats assigned
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon name="add" className="text-lg" />
          Add Table
        </button>
      </div>

      {/* ─── Legend ─── */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs font-label text-on-surface-variant">
            Full
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-xs font-label text-on-surface-variant">
            Available
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-outline-variant/40" />
          <span className="text-xs font-label text-on-surface-variant">
            Empty
          </span>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ─── Seating Grid ─── */}
        <div className="lg:col-span-8">
          {tables.length === 0 ? (
            <div className="text-center py-20">
              <Icon name="table_restaurant" className="text-5xl text-primary/20" />
              <p className="mt-4 text-on-surface-variant/50 font-label text-sm">
                No tables yet. Add your first table to start arranging seating!
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 justify-center">
              {tables.map((table) => {
                const status = getTableStatus(table);
                const isSelected = selectedTable === table.id;
                const isRect = table.shape === "RECTANGULAR";

                const guestPreview =
                  table.guests.length > 0
                    ? table.guests
                        .slice(0, 2)
                        .map((g) => g.name.split(" ")[0])
                        .join(", ") +
                      (table.guests.length > 2 ? ` +${table.guests.length - 2}` : "")
                    : null;

                const tableSide = tableSides[table.id] ?? "NONE";

                /* ── Round table (circle) ── */
                if (!isRect) {
                  return (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(isSelected ? null : table.id)}
                      className={`relative w-44 h-44 rounded-full bg-surface-container-lowest flex flex-col items-center justify-center text-center ${getStatusRingClass(status)} hover:shadow-lg transition-all cursor-pointer shrink-0 ${
                        isSelected ? "!ring-[3px] !ring-primary shadow-lg scale-[1.04]" : ""
                      }`}
                    >
                      {/* Status dot — nudged inward so it sits inside the
                          circle, not on the bounding-box corner where the
                          ring would clip it. */}
                      <div className={`absolute top-5 right-5 w-2.5 h-2.5 rounded-full ${getStatusDotClass(status)}`} />

                      {/* Side designation pill — centered along the top
                          INSIDE the circle. Corner placement gets cut off by
                          the round border. */}
                      {tableSide !== "NONE" && (
                        <span className={`absolute top-4 left-1/2 -translate-x-1/2 inline-flex items-center justify-center text-[9px] font-label font-semibold px-1.5 py-0.5 rounded-full ${getSideClass(tableSide)}`}>
                          {tableSide === "MUTUAL" ? "Mutual" : tableSide === "BRIDE" ? "Bride" : "Groom"}
                        </span>
                      )}

                      {/* Table name */}
                      <span className="font-headline text-lg text-on-surface leading-none mb-1 mt-2">
                        {table.name}
                      </span>

                      {/* Capacity */}
                      <p className="text-xs font-label text-on-surface-variant">
                        {table.guests.length}/{table.capacity} seats
                      </p>

                      {/* Guest preview */}
                      <p className="mt-1.5 text-[10px] font-label text-on-surface-variant/60 max-w-[120px] truncate leading-tight">
                        {guestPreview ?? (
                          <span className="italic text-on-surface-variant/35">No guests</span>
                        )}
                      </p>

                      {/* Status badge */}
                      <span className={`mt-1.5 inline-block text-[9px] font-label font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        status === "full"
                          ? "bg-green-500/10 text-green-600"
                          : status === "available"
                          ? "bg-primary/10 text-primary"
                          : "bg-outline-variant/10 text-on-surface-variant/50"
                      }`}>
                        {getStatusLabel(status)}
                      </span>
                    </button>
                  );
                }

                /* ── Rectangular table ── */
                return (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(isSelected ? null : table.id)}
                    className={`relative w-56 h-36 rounded-2xl bg-surface-container-lowest flex flex-col justify-center px-5 ${getStatusRingClass(status)} hover:shadow-lg transition-all cursor-pointer shrink-0 ${
                      isSelected ? "!ring-[3px] !ring-primary shadow-lg scale-[1.04]" : ""
                    }`}
                  >
                    {/* Status dot */}
                    <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${getStatusDotClass(status)}`} />

                    {/* Side designation pill */}
                    {tableSide !== "NONE" && (
                      <span className={`absolute top-3 left-3 inline-flex items-center justify-center text-[9px] font-label font-semibold px-1.5 py-0.5 rounded-full ${getSideClass(tableSide)}`}>
                        {tableSide === "MUTUAL" ? "Mutual" : tableSide === "BRIDE" ? "Bride" : "Groom"}
                      </span>
                    )}

                    {/* Name + capacity row */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-headline text-lg text-on-surface leading-none">
                        {table.name}
                      </span>
                      <span className="text-on-surface-variant/30 font-label text-xs">&mdash;</span>
                      <span className="text-xs font-label text-on-surface-variant">
                        {table.guests.length}/{table.capacity} seats
                      </span>
                    </div>

                    {/* Guest preview */}
                    <p className="text-[11px] font-label text-on-surface-variant/60 truncate leading-tight">
                      {guestPreview ?? (
                        <span className="italic text-on-surface-variant/35">No guests assigned</span>
                      )}
                    </p>

                    {/* Status badge */}
                    <span className={`mt-2 self-start inline-block text-[9px] font-label font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      status === "full"
                        ? "bg-green-500/10 text-green-600"
                        : status === "available"
                        ? "bg-primary/10 text-primary"
                        : "bg-outline-variant/10 text-on-surface-variant/50"
                    }`}>
                      {getStatusLabel(status)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ─── Selected Table Detail ─── */}
          {selectedTable && (
            <div className="mt-6 bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-headline text-xl text-on-surface">
                    {tables.find((t) => t.id === selectedTable)?.name} &mdash;
                    Guest List
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-[11px] font-label text-on-surface-variant ghost-border">
                    <Icon name={tables.find((t) => t.id === selectedTable)?.shape === "RECTANGULAR" ? "crop_landscape" : "circle"} className="text-xs text-primary/60" />
                    {tables.find((t) => t.id === selectedTable)?.shape === "RECTANGULAR" ? "Rectangular" : "Round"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const table = tables.find((t) => t.id === selectedTable);
                      if (table) openEditModal(table);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant/40 text-xs font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTable(selectedTable)}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant/40 text-on-surface-variant/50 hover:text-error hover:border-error/30 transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {/* Designated side selector */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-label font-semibold text-on-surface-variant/70 mr-1">
                  Designated for
                </span>
                {(["NONE", "BRIDE", "GROOM", "MUTUAL"] as TableSide[]).map((side) => {
                  const active = (tableSides[selectedTable] ?? "NONE") === side;
                  const label = side === "NONE" ? "None" : side === "MUTUAL" ? "Mutual" : side === "BRIDE" ? "Bride" : "Groom";
                  return (
                    <button
                      key={side}
                      type="button"
                      onClick={() => updateTableSide(selectedTable, side)}
                      className={`px-3 py-1 rounded-full text-[11px] font-label font-medium transition-all cursor-pointer ${
                        active
                          ? side === "BRIDE"
                            ? "bg-pink-500/15 text-pink-600 ring-1 ring-pink-500/40"
                            : side === "GROOM"
                            ? "bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/40"
                            : side === "MUTUAL"
                            ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "bg-surface-container text-on-surface ring-1 ring-outline-variant/40"
                          : "bg-surface-container-low text-on-surface-variant ghost-border hover:text-on-surface"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {tables
                  .find((t) => t.id === selectedTable)
                  ?.guests.map((guest) => (
                    <span
                      key={guest.id}
                      className="px-3 py-1.5 rounded-full bg-surface-container-low text-xs font-label text-on-surface-variant ghost-border flex items-center gap-1.5 group"
                    >
                      <Icon name="person" className="text-sm text-primary/50" />
                      {guest.name}
                      <button
                        onClick={() => unassignGuest(guest.id)}
                        className="text-on-surface-variant/30 hover:text-error transition-colors cursor-pointer ml-1"
                        title="Remove from table"
                      >
                        <Icon name="close" className="text-xs" />
                      </button>
                    </span>
                  ))}
                {tables.find((t) => t.id === selectedTable)?.guests.length ===
                  0 && (
                  <p className="text-sm text-on-surface-variant/50 italic font-label">
                    No guests assigned to this table yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Unassigned Guests Sidebar ─── */}
        <div className="lg:col-span-4">
          {/* Two-region layout: scrollable middle (header+list), sticky footer
              for the Assign button. Capping the panel height prevents it from
              growing taller than the viewport when there are many guests. */}
          <div className="bg-surface-container-lowest rounded-3xl ambient-shadow ghost-border sticky top-24 flex flex-col max-h-[calc(100vh-7rem)] overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-xl text-on-surface">
                  Unassigned
                </h2>
                {/* Density toggle */}
                <button
                  type="button"
                  onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
                  className="p-1 rounded-lg text-on-surface-variant/60 hover:text-primary hover:bg-primary-container/10 cursor-pointer transition-all"
                  title={density === "compact" ? "Switch to comfortable view" : "Switch to compact view"}
                  aria-label="Toggle density"
                >
                  <Icon name={density === "compact" ? "expand" : "compress"} className="text-base" />
                </button>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-error-container/30 text-error text-[11px] font-label font-medium">
                {unassignedGuests.length} guests
              </span>
            </div>

            {/* Scrollable region: keeps header (search + filters) and the
                guest list together but inside its own scroll context. */}
            <div className="flex-1 overflow-y-auto px-6">

            {/* Selected table capacity info */}
            {selectedTableObj ? (
              <p className="text-xs font-label text-on-surface-variant/60 mb-3">
                <span className="font-medium text-on-surface">{selectedTableObj.name}</span>
                {" \u2014 "}
                <span className={availableSeats === 0 ? "text-error" : "text-primary"}>
                  {availableSeats} {availableSeats === 1 ? "seat" : "seats"} available
                </span>
              </p>
            ) : (
              <p className="text-xs text-on-surface-variant/60 font-label mb-3">
                Select a table, then check guests to assign
              </p>
            )}

            {/* Search input */}
            {unassignedGuests.length > 0 && (
              <div className="relative mb-3">
                <Icon name="search" className="text-sm text-on-surface-variant/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guestSearch}
                  onChange={(e) => { setGuestSearch(e.target.value); setGuestPage(0); }}
                  placeholder="Search guests..."
                  className="w-full bg-surface-container-low rounded-xl py-2.5 pl-9 pr-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            )}

            {/* Filter chips */}
            {unassignedGuests.length > 0 && (
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-label font-semibold text-on-surface-variant/60 mr-0.5">
                    RSVP
                  </span>
                  {([
                    { key: "ALL", label: "All" },
                    { key: "ATTENDING", label: "Attending" },
                    { key: "NO_RESPONSE", label: "No Response" },
                    { key: "NOT_COMING", label: "Not Coming" },
                  ] as { key: RsvpFilter; label: string }[]).map((opt) => {
                    const active = rsvpFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => { setRsvpFilter(opt.key); setGuestPage(0); }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-label transition-all cursor-pointer ${
                          active
                            ? "bg-primary/10 text-primary ring-1 ring-primary/30 font-medium"
                            : "bg-surface-container-low text-on-surface-variant ghost-border hover:text-on-surface"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-label font-semibold text-on-surface-variant/60 mr-0.5">
                    Side
                  </span>
                  {([
                    { key: "ALL", label: "All" },
                    { key: "BRIDE", label: "Bride" },
                    { key: "GROOM", label: "Groom" },
                    { key: "MUTUAL", label: "Mutual" },
                  ] as { key: SideFilter; label: string }[]).map((opt) => {
                    const active = sideFilter === opt.key;
                    const activeClass =
                      opt.key === "BRIDE"
                        ? "bg-pink-500/15 text-pink-600 ring-1 ring-pink-500/40 font-medium"
                        : opt.key === "GROOM"
                        ? "bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/40 font-medium"
                        : "bg-primary/10 text-primary ring-1 ring-primary/30 font-medium";
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => { setSideFilter(opt.key); setSideFilterManual(true); setGuestPage(0); }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-label transition-all cursor-pointer ${
                          active
                            ? activeClass
                            : "bg-surface-container-low text-on-surface-variant ghost-border hover:text-on-surface"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={groupBySurname}
                      onChange={(e) => { setGroupBySurname(e.target.checked); setCollapsedSurnames(new Set()); }}
                      className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                    />
                    <span className="text-[11px] font-label text-on-surface-variant">
                      Group by surname
                    </span>
                  </label>
                  {sideFilterManual && selectedTable && tableSides[selectedTable] && tableSides[selectedTable] !== "NONE" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSideFilterManual(false);
                        const s = tableSides[selectedTable];
                        if (s === "BRIDE" || s === "GROOM" || s === "MUTUAL") {
                          setSideFilter(s);
                          setGuestPage(0);
                        }
                      }}
                      className="text-[10px] font-label text-primary hover:underline cursor-pointer"
                    >
                      Sync to table
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bulk-family suggestion */}
            {bulkFamilySuggestion && selectedTable && (
              <button
                type="button"
                onClick={() => assignMultipleGuests(bulkFamilySuggestion.ids)}
                disabled={assigning || availableSeats === 0}
                className="w-full mb-3 px-3 py-2 rounded-xl bg-primary/10 ring-1 ring-primary/30 text-primary text-xs font-label font-medium hover:bg-primary/15 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Icon name="groups" className="text-sm" />
                Add all {bulkFamilySuggestion.count} {bulkFamilySuggestion.surname}s to{" "}
                {selectedTableObj?.name ?? "table"}
              </button>
            )}

            {/* Count display */}
            {unassignedGuests.length > 0 && (
              <p className="text-[11px] font-label text-on-surface-variant/50 mb-2">
                {guestSearch || rsvpFilter !== "ALL" || sideFilter !== "ALL"
                  ? `Showing ${filteredUnassigned.length} of ${unassignedGuests.length} guests`
                  : `${unassignedGuests.length} unassigned guests`}
                {totalPages > 1 && ` · Page ${guestPage + 1} of ${totalPages}`}
              </p>
            )}

            {unassignedGuests.length === 0 ? (
              <p className="text-sm text-on-surface-variant/50 italic font-label text-center py-6">
                All guests have been assigned!
              </p>
            ) : (
              <>
                {/* Select All checkbox (current page) */}
                {paginatedGuests.length > 0 && (
                  <label className="flex items-center gap-3 px-3 py-2 mb-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={
                        paginatedGuests.length > 0 &&
                        paginatedGuests.every((g) => selectedGuests.has(g.id))
                      }
                      onChange={(e) => {
                        const next = new Set(selectedGuests);
                        if (e.target.checked) {
                          paginatedGuests.forEach((g) => next.add(g.id));
                        } else {
                          paginatedGuests.forEach((g) => next.delete(g.id));
                        }
                        setSelectedGuests(next);
                      }}
                      disabled={!selectedTable}
                      className="h-4 w-4 rounded accent-primary cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="text-xs font-label text-on-surface-variant font-medium">
                      Select All on Page ({paginatedGuests.length})
                    </span>
                  </label>
                )}

                {/* Guest list (paginated) */}
                {!groupBySurname ? (
                  <div className={density === "compact" ? "space-y-1" : "space-y-2"}>
                    {paginatedGuests.map((guest) => (
                      <GuestRow
                        key={guest.id}
                        guest={guest}
                        selected={selectedGuests.has(guest.id)}
                        disabled={!selectedTable}
                        compact={density === "compact"}
                        onToggle={(checked) => {
                          const next = new Set(selectedGuests);
                          if (checked) next.add(guest.id);
                          else next.delete(guest.id);
                          setSelectedGuests(next);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groupedPage.map((grp) => {
                      const isCollapsed = collapsedSurnames.has(grp.key);
                      const allSelected = grp.guests.every((g) => selectedGuests.has(g.id));
                      return (
                        <div key={grp.key} className="rounded-2xl bg-surface-container-low/40 ghost-border overflow-hidden">
                          <div className="sticky top-0 z-[1] flex items-center gap-2 px-3 py-2 bg-surface-container-low/95 backdrop-blur-sm">
                            <input
                              type="checkbox"
                              checked={allSelected && grp.guests.length > 0}
                              onChange={(e) => {
                                const next = new Set(selectedGuests);
                                if (e.target.checked) grp.guests.forEach((g) => next.add(g.id));
                                else grp.guests.forEach((g) => next.delete(g.id));
                                setSelectedGuests(next);
                              }}
                              disabled={!selectedTable}
                              className="h-4 w-4 rounded accent-primary cursor-pointer disabled:cursor-not-allowed"
                              title="Select all in this family"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(collapsedSurnames);
                                if (next.has(grp.key)) next.delete(grp.key);
                                else next.add(grp.key);
                                setCollapsedSurnames(next);
                              }}
                              className="flex-1 flex items-center justify-between text-left cursor-pointer"
                            >
                              <span className="font-headline text-sm text-on-surface">
                                {grp.label}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="text-[10px] font-label text-on-surface-variant/60">
                                  {grp.guests.length}
                                </span>
                                <Icon name="expand_more" className={`text-base text-on-surface-variant/50 transition-transform ${isCollapsed ? "" : "rotate-180"}`} />
                              </span>
                            </button>
                          </div>
                          {!isCollapsed && (
                            <div className={`${density === "compact" ? "space-y-1 p-1.5" : "space-y-2 p-2"}`}>
                              {grp.guests.map((guest) => (
                                <GuestRow
                                  key={guest.id}
                                  guest={guest}
                                  selected={selectedGuests.has(guest.id)}
                                  disabled={!selectedTable}
                                  compact={density === "compact"}
                                  onToggle={(checked) => {
                                    const next = new Set(selectedGuests);
                                    if (checked) next.add(guest.id);
                                    else next.delete(guest.id);
                                    setSelectedGuests(next);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </>
            )}
            </div>
            {/* end scrollable region */}

            {/* Sticky footer: pagination + capacity warning + Assign button.
                Always pinned to the bottom of the panel so users never have
                to scroll to find them. */}
            {unassignedGuests.length > 0 && (
              <div className="border-t border-outline-variant/15 bg-surface-container-lowest p-4 space-y-2">
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setGuestPage((p) => Math.max(0, p - 1))}
                      disabled={guestPage === 0}
                      className="flex items-center gap-1 text-xs font-label text-primary disabled:text-on-surface-variant/30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Icon name="chevron_left" className="text-sm" />
                      Prev
                    </button>
                    <span className="text-[11px] font-label text-on-surface-variant">
                      {guestPage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setGuestPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={guestPage >= totalPages - 1}
                      className="flex items-center gap-1 text-xs font-label text-primary disabled:text-on-surface-variant/30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                      <Icon name="chevron_right" className="text-sm" />
                    </button>
                  </div>
                )}

                {selectedGuests.size > 0 && selectedTableObj && selectedGuests.size > availableSeats && (
                  <p className="text-xs text-error font-label">
                    Only {availableSeats} {availableSeats === 1 ? "seat" : "seats"} available &mdash; {selectedGuests.size - availableSeats} {selectedGuests.size - availableSeats === 1 ? "guest" : "guests"} won&apos;t be assigned
                  </p>
                )}

                {selectedGuests.size > 0 && (
                  <button
                    onClick={() => assignMultipleGuests()}
                    disabled={!selectedTable || availableSeats === 0 || assigning}
                    className="w-full gold-gradient text-white py-2.5 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Icon name="group_add" className="text-lg" />
                    {assigning
                      ? "Assigning..."
                      : `Assign ${Math.min(selectedGuests.size, availableSeats)} ${Math.min(selectedGuests.size, availableSeats) === 1 ? "Guest" : "Guests"}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Add/Edit Table Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-md sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingTable ? "Edit Table" : "Add New Table"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Table Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Table 1"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Table Shape
                </label>
                <div className="flex gap-3">
                  <label className="cursor-pointer">
                    <input type="radio" name="shape" value="ROUND" className="peer sr-only" checked={formData.shape === "ROUND"} onChange={() => setFormData({ ...formData, shape: "ROUND" })} />
                    <div className="flex items-center gap-2 rounded-full px-4 py-2 ghost-border bg-background peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary/20 transition-all">
                      <Icon name="circle" className="text-lg text-primary" />
                      <span className="text-sm font-label text-on-surface">Round</span>
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" name="shape" value="RECTANGULAR" className="peer sr-only" checked={formData.shape === "RECTANGULAR"} onChange={() => setFormData({ ...formData, shape: "RECTANGULAR" })} />
                    <div className="flex items-center gap-2 rounded-full px-4 py-2 ghost-border bg-background peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary/20 transition-all">
                      <Icon name="crop_landscape" className="text-lg text-primary" />
                      <span className="text-sm font-label text-on-surface">Rectangular</span>
                    </div>
                  </label>
                </div>
              </div>
              {formError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                  <Icon name="error" className="text-red-600 text-base mt-0.5 shrink-0" />
                  <p className="text-xs font-label text-red-700 leading-relaxed">
                    {formError}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? "Saving..." : editingTable ? "Update Table" : "Add Table"}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingTable(null); setFormError(null); }}
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
