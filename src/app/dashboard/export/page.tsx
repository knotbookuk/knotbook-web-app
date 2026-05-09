"use client";

import { useState } from "react";
import { downloadCsv, rowsToCsv, formatGbp, formatUkDate, type CsvCell } from "@/lib/csv";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface ExportOption {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const exportOptions: ExportOption[] = [
  {
    id: "guest-list",
    icon: "group",
    title: "Guest List",
    description:
      "Every guest with email, phone, RSVP, family side, meal preference, dietary type, allergies, plus-ones, table assignment, and notes.",
  },
  {
    id: "seating-plan",
    icon: "table_restaurant",
    title: "Seating Plan",
    description:
      "Flat list — one row per guest with their assigned table, capacity, RSVP, and meal preference. Print-ready for place cards.",
  },
  {
    id: "tables-summary",
    icon: "view_module",
    title: "Tables Summary",
    description:
      "One row per table: name, shape, capacity, seats used, and the comma-separated list of guests at that table.",
  },
  {
    id: "budget-summary",
    icon: "account_balance_wallet",
    title: "Budget Summary",
    description:
      "Full budget breakdown with estimated, actual, and paid amounts per item, status, and end-of-sheet totals.",
  },
  {
    id: "menu-catering",
    icon: "restaurant_menu",
    title: "Menu & Catering",
    description:
      "Foods (with dietary flags) and beverages (with vendor + alcohol indicator), plus any special catering notes.",
  },
  {
    id: "vendor-list",
    icon: "storefront",
    title: "Vendor List",
    description:
      "All vendors with category, contact details, website, quote, deposit, status, rating, and notes.",
  },
  {
    id: "wedding-timeline",
    icon: "schedule",
    title: "Wedding Timeline",
    description:
      "Day-of schedule with event name, date, start/end times, venue, and description.",
  },
  {
    id: "tasks",
    icon: "assignment",
    title: "Tasks",
    description:
      "Every task with title, description, assignee, due date, priority, category, and current status.",
  },
  {
    id: "checklists",
    icon: "checklist",
    title: "Checklists",
    description:
      "Checklist items grouped with category and due date, including completion state.",
  },
];

/* ─── Source-data shapes (just the fields the export consumes) ─── */

interface GuestRow {
  name: string;
  email: string | null;
  phone: string | null;
  familySide: string;
  rsvpStatus: string;
  mealPreference: string | null;
  dietaryType: string | null;
  allergies: string | null;
  allergySeverity: string | null;
  dietaryNotes: string | null;
  plusOnes: number;
  notes: string | null;
  seatingTable: { name: string } | null;
}

interface BudgetItem {
  category: string;
  description: string | null;
  estimatedCost: number;
  actualCost: number;
  paidAmount: number;
  status: string;
  dueDate: string | null;
}
interface BudgetTotals {
  estimated: number;
  actual: number;
  paid: number;
  budget: number;
  remaining: number;
}

interface SeatingTable {
  name: string;
  shape: string;
  capacity: number;
  guests: { name: string; familySide: string; rsvpStatus: string; mealPreference: string | null }[];
}

interface VendorRow {
  name: string;
  category: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  quoteAmount: number | string | null;
  depositAmount: number | string | null;
  status: string;
  rating: number | null;
  notes: string | null;
}

interface EventRow {
  name: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  description: string | null;
}

interface TaskRow {
  title: string;
  description: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  category: string | null;
}

interface ChecklistRow {
  title: string;
  description: string | null;
  category: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
}

interface MenuItemRow {
  name: string;
  category: string;
  description: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  notes: string | null;
}

interface MenuBeverageRow {
  name: string;
  category: string;
  description: string | null;
  vendor: string | null;
  isAlcoholic: boolean;
  notes: string | null;
}

interface CateringNoteRow {
  content: string;
}

/* ─── Page ─── */

export default function ExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    setDownloading(id);
    setError(null);
    try {
      switch (id) {
        case "guest-list":
          await exportGuestList();
          break;
        case "seating-plan":
          await exportSeatingPlanFlat();
          break;
        case "tables-summary":
          await exportTablesSummary();
          break;
        case "budget-summary":
          await exportBudget();
          break;
        case "menu-catering":
          await exportMenuCatering();
          break;
        case "vendor-list":
          await exportVendors();
          break;
        case "wedding-timeline":
          await exportTimeline();
          break;
        case "tasks":
          await exportTasks();
          break;
        case "checklists":
          await exportChecklists();
          break;
      }
    } catch (err) {
      setError((err as Error).message || "Export failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
          Export &amp; Downloads
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant font-label">
          Download your wedding planning data as Excel-compatible CSV files
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
          <Icon name="error" className="text-red-600 text-base mt-0.5 shrink-0" />
          <p className="text-sm font-label text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {exportOptions.map((option) => (
          <div
            key={option.id}
            className="bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border flex flex-col"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-container/15 flex items-center justify-center mb-5">
              <Icon name={option.icon} className="text-2xl text-primary" />
            </div>

            <h3 className="font-headline text-xl text-on-surface mb-2">
              {option.title}
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-5 flex-1">
              {option.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              <span className="px-3 py-1 rounded-full bg-surface-container-low text-xs font-label font-medium text-on-surface-variant ghost-border">
                CSV (UTF-8)
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-container-low text-xs font-label font-medium text-on-surface-variant ghost-border">
                Excel-ready
              </span>
            </div>

            <button
              onClick={() => handleDownload(option.id)}
              disabled={downloading === option.id}
              className="gold-gradient text-white px-5 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100 cursor-pointer"
            >
              <Icon name={downloading === option.id ? "hourglass_top" : "download"} className="text-lg" />
              {downloading === option.id ? "Preparing..." : "Download"}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border">
        <div className="flex items-start gap-4">
          <Icon name="info" className="text-primary/40 text-2xl mt-0.5" />
          <div>
            <h3 className="font-headline text-lg text-on-surface mb-1">
              About these exports
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              All exports are generated live. Files are CSV with UTF-8 BOM and
              CRLF line endings, so Excel, Numbers, and Google Sheets render
              currency symbols, accents, and emojis correctly when you double-
              click them. Numeric columns stay numeric; dates use DD/MM/YYYY.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Individual exports ─── */

async function exportGuestList(): Promise<void> {
  const res = await fetch("/api/guests");
  if (!res.ok) throw new Error("Could not load guests");
  const guests: GuestRow[] = await res.json();
  if (!Array.isArray(guests)) throw new Error("Unexpected guest payload");

  const headers: CsvCell[] = [
    "Name",
    "Email",
    "Phone",
    "Family Side",
    "RSVP Status",
    "Meal Preference",
    "Dietary Type",
    "Allergies",
    "Allergy Severity",
    "Dietary Notes",
    "Additional Members",
    "Table",
    "Notes",
  ];
  const rows: CsvCell[][] = guests.map((g) => [
    g.name,
    g.email,
    g.phone,
    g.familySide,
    g.rsvpStatus,
    g.mealPreference,
    g.dietaryType,
    g.allergies,
    g.allergySeverity,
    g.dietaryNotes,
    g.plusOnes ?? 0,
    g.seatingTable?.name ?? "",
    g.notes,
  ]);
  downloadCsv("guest-list.csv", rowsToCsv([headers, ...rows]));
}

async function exportSeatingPlanFlat(): Promise<void> {
  const res = await fetch("/api/seating");
  if (!res.ok) throw new Error("Could not load seating");
  const tables: SeatingTable[] = await res.json();
  if (!Array.isArray(tables)) throw new Error("Unexpected seating payload");

  const headers: CsvCell[] = [
    "Table",
    "Shape",
    "Capacity",
    "Guest Name",
    "Family Side",
    "RSVP Status",
    "Meal Preference",
  ];
  const rows: CsvCell[][] = [];
  for (const t of tables) {
    if (t.guests.length === 0) {
      rows.push([t.name, t.shape, t.capacity, "(empty)", "", "", ""]);
      continue;
    }
    for (const g of t.guests) {
      rows.push([
        t.name,
        t.shape,
        t.capacity,
        g.name,
        g.familySide,
        g.rsvpStatus,
        g.mealPreference,
      ]);
    }
  }
  downloadCsv("seating-plan.csv", rowsToCsv([headers, ...rows]));
}

async function exportTablesSummary(): Promise<void> {
  const res = await fetch("/api/seating");
  if (!res.ok) throw new Error("Could not load seating");
  const tables: SeatingTable[] = await res.json();
  if (!Array.isArray(tables)) throw new Error("Unexpected seating payload");

  const headers: CsvCell[] = [
    "Table",
    "Shape",
    "Capacity",
    "Seats Used",
    "Status",
    "Guests",
  ];
  const rows: CsvCell[][] = tables.map((t) => {
    const used = t.guests.length;
    const status = used === 0 ? "Empty" : used >= t.capacity ? "Full" : "Available";
    return [
      t.name,
      t.shape,
      t.capacity,
      used,
      status,
      t.guests.map((g) => g.name).join("; "),
    ];
  });
  downloadCsv("tables-summary.csv", rowsToCsv([headers, ...rows]));
}

async function exportBudget(): Promise<void> {
  const res = await fetch("/api/budget");
  if (!res.ok) throw new Error("Could not load budget");
  const data: { items?: BudgetItem[]; totals?: BudgetTotals } = await res.json();
  const items = data.items ?? [];

  const headers: CsvCell[] = [
    "Category",
    "Description",
    "Estimated (£)",
    "Actual (£)",
    "Paid (£)",
    "Status",
    "Due Date",
  ];
  const rows: CsvCell[][] = items.map((i) => [
    i.category,
    i.description,
    formatGbp(i.estimatedCost),
    formatGbp(i.actualCost),
    formatGbp(i.paidAmount),
    i.status,
    formatUkDate(i.dueDate),
  ]);

  if (data.totals) {
    rows.push([]);
    rows.push([
      "TOTALS",
      "",
      formatGbp(data.totals.estimated),
      formatGbp(data.totals.actual),
      formatGbp(data.totals.paid),
      "",
      "",
    ]);
    rows.push(["Budget", formatGbp(data.totals.budget), "", "", "", "", ""]);
    rows.push(["Remaining", formatGbp(data.totals.remaining), "", "", "", "", ""]);
  }
  downloadCsv("budget-summary.csv", rowsToCsv([headers, ...rows]));
}

async function exportMenuCatering(): Promise<void> {
  const res = await fetch("/api/catering");
  if (!res.ok) throw new Error("Could not load catering");
  const data: {
    menuItems: MenuItemRow[];
    menuBeverages: MenuBeverageRow[];
    cateringNotes: CateringNoteRow[];
  } = await res.json();

  const rows: CsvCell[][] = [];
  rows.push(["FOODS"]);
  rows.push(["Name", "Category", "Description", "Vegetarian", "Vegan", "Gluten-Free", "Notes"]);
  for (const m of data.menuItems ?? []) {
    rows.push([
      m.name,
      m.category,
      m.description,
      m.isVegetarian,
      m.isVegan,
      m.isGlutenFree,
      m.notes,
    ]);
  }

  rows.push([]);
  rows.push(["BEVERAGES"]);
  rows.push(["Name", "Category", "Description", "Vendor", "Alcoholic", "Notes"]);
  for (const b of data.menuBeverages ?? []) {
    rows.push([
      b.name,
      b.category,
      b.description,
      b.vendor,
      b.isAlcoholic,
      b.notes,
    ]);
  }

  rows.push([]);
  rows.push(["SPECIAL NOTES"]);
  for (const n of data.cateringNotes ?? []) {
    rows.push([n.content]);
  }
  downloadCsv("menu-catering.csv", rowsToCsv(rows));
}

async function exportVendors(): Promise<void> {
  const res = await fetch("/api/vendors");
  if (!res.ok) throw new Error("Could not load vendors");
  const vendors: VendorRow[] = await res.json();
  if (!Array.isArray(vendors)) throw new Error("Unexpected vendors payload");

  const headers: CsvCell[] = [
    "Name",
    "Category",
    "Contact Name",
    "Email",
    "Phone",
    "Website",
    "Quote (£)",
    "Deposit (£)",
    "Status",
    "Rating",
    "Notes",
  ];
  const rows: CsvCell[][] = vendors.map((v) => [
    v.name,
    v.category,
    v.contactName,
    v.email,
    v.phone,
    v.website,
    formatGbp(v.quoteAmount as number | null),
    formatGbp(v.depositAmount as number | null),
    v.status,
    v.rating,
    v.notes,
  ]);
  downloadCsv("vendor-list.csv", rowsToCsv([headers, ...rows]));
}

async function exportTimeline(): Promise<void> {
  const res = await fetch("/api/events");
  if (!res.ok) throw new Error("Could not load events");
  const events: EventRow[] = await res.json();
  if (!Array.isArray(events)) throw new Error("Unexpected events payload");

  const headers: CsvCell[] = [
    "Event",
    "Date",
    "Start Time",
    "End Time",
    "Venue",
    "Description",
  ];
  const rows: CsvCell[][] = events.map((e) => [
    e.name,
    formatUkDate(e.date),
    e.startTime,
    e.endTime,
    e.venue,
    e.description,
  ]);
  downloadCsv("wedding-timeline.csv", rowsToCsv([headers, ...rows]));
}

async function exportTasks(): Promise<void> {
  const res = await fetch("/api/tasks");
  if (!res.ok) throw new Error("Could not load tasks");
  const tasks: TaskRow[] = await res.json();
  if (!Array.isArray(tasks)) throw new Error("Unexpected tasks payload");

  const headers: CsvCell[] = [
    "Title",
    "Description",
    "Assignee",
    "Due Date",
    "Priority",
    "Category",
    "Status",
  ];
  const rows: CsvCell[][] = tasks.map((t) => [
    t.title,
    t.description,
    t.assigneeName,
    formatUkDate(t.dueDate),
    t.priority,
    t.category,
    t.status,
  ]);
  downloadCsv("tasks.csv", rowsToCsv([headers, ...rows]));
}

async function exportChecklists(): Promise<void> {
  const res = await fetch("/api/checklists");
  if (!res.ok) throw new Error("Could not load checklists");
  const items: ChecklistRow[] = await res.json();
  if (!Array.isArray(items)) throw new Error("Unexpected checklists payload");

  const headers: CsvCell[] = [
    "Title",
    "Description",
    "Category",
    "Due Date",
    "Completed",
    "Completed At",
  ];
  const rows: CsvCell[][] = items.map((i) => [
    i.title,
    i.description,
    i.category,
    formatUkDate(i.dueDate),
    i.isCompleted,
    formatUkDate(i.completedAt),
  ]);
  downloadCsv("checklists.csv", rowsToCsv([headers, ...rows]));
}
