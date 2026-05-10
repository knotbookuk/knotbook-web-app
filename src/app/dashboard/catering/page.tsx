"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface MenuItemType {
  id: string;
  name: string;
  category: "APPETIZER" | "MAIN_COURSE" | "SIDE_DISH" | "DESSERT";
  description: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  notes: string | null;
}

interface MenuBeverageType {
  id: string;
  name: string;
  category: "COCKTAIL" | "WINE" | "NON_ALCOHOLIC";
  description: string | null;
  vendor: string | null;
  isAlcoholic: boolean;
  notes: string | null;
}

interface CateringNoteType {
  id: string;
  content: string;
}

type CulturalStyle = "CLASSIC_BRITISH" | "CLASSIC_ASIAN" | "ARAB";
type ActiveTab = "foods" | "beverages" | "notes";
type DietFilter = "all" | "vegetarian" | "vegan" | "glutenFree" | "halal";
type AlcoholFilter = "all" | "alcoholic" | "non-alcoholic";

/* ─── Food categories per culture ─── */
function foodCategoriesFor(style: CulturalStyle) {
  if (style === "ARAB") {
    return [
      { value: "APPETIZER", label: "Mezze", icon: "tapas" },
      { value: "MAIN_COURSE", label: "Main Courses", icon: "dinner_dining" },
      { value: "SIDE_DISH", label: "Grills", icon: "outdoor_grill" },
      { value: "DESSERT", label: "Desserts", icon: "cake" },
    ] as const;
  }
  return [
    { value: "APPETIZER", label: "Starters", icon: "tapas" },
    { value: "MAIN_COURSE", label: "Main Courses", icon: "dinner_dining" },
    { value: "SIDE_DISH", label: "Side Dishes", icon: "rice_bowl" },
    { value: "DESSERT", label: "Desserts", icon: "cake" },
  ] as const;
}

const BEVERAGE_CATEGORIES = [
  { value: "COCKTAIL", label: "Cocktails", icon: "local_bar" },
  { value: "WINE", label: "Wine", icon: "wine_bar" },
  { value: "NON_ALCOHOLIC", label: "Non-Alcoholic", icon: "local_cafe" },
] as const;

/* ─── Beverage type label (granular than category) ─── */
function beverageTypeLabel(b: MenuBeverageType): string {
  if (b.category === "WINE") return "Wine";
  if (b.category === "COCKTAIL") return b.isAlcoholic ? "Cocktail" : "Mocktail";
  return "Non-Alcoholic";
}

/* ─── Suggested beverages per culture (quick-add chips) ─── */
const beverageSuggestions: Record<
  CulturalStyle,
  { name: string; category: MenuBeverageType["category"]; isAlcoholic: boolean }[]
> = {
  ARAB: [
    { name: "Fresh Mint Lemonade", category: "NON_ALCOHOLIC", isAlcoholic: false },
    { name: "Jallab", category: "NON_ALCOHOLIC", isAlcoholic: false },
    { name: "Arabic Coffee", category: "NON_ALCOHOLIC", isAlcoholic: false },
    { name: "Assorted Juices", category: "NON_ALCOHOLIC", isAlcoholic: false },
    { name: "Tamarind Cooler", category: "NON_ALCOHOLIC", isAlcoholic: false },
  ],
  CLASSIC_ASIAN: [
    { name: "Mango Mint Cooler", category: "COCKTAIL", isAlcoholic: false },
    { name: "Mango Lassi", category: "NON_ALCOHOLIC", isAlcoholic: false },
    { name: "Jasmine Green Tea", category: "NON_ALCOHOLIC", isAlcoholic: false },
    { name: "Sparkling Water", category: "NON_ALCOHOLIC", isAlcoholic: false },
    { name: "Coffee & Tea", category: "NON_ALCOHOLIC", isAlcoholic: false },
  ],
  CLASSIC_BRITISH: [
    { name: "House Wine (Red & White)", category: "WINE", isAlcoholic: true },
    { name: "Beer & Cider", category: "COCKTAIL", isAlcoholic: true },
    { name: "Prosecco", category: "WINE", isAlcoholic: true },
    { name: "Soft Drinks", category: "NON_ALCOHOLIC", isAlcoholic: false },
    { name: "Tea & Coffee", category: "NON_ALCOHOLIC", isAlcoholic: false },
    { name: "Sparkling Water", category: "NON_ALCOHOLIC", isAlcoholic: false },
  ],
};

const defaultFoodForm = {
  name: "",
  category: "APPETIZER" as MenuItemType["category"],
  description: "",
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  notes: "",
};

const defaultBeverageForm = {
  name: "",
  category: "COCKTAIL" as MenuBeverageType["category"],
  description: "",
  vendor: "",
  isAlcoholic: false,
  notes: "",
};

const defaultNoteForm = {
  content: "",
};

/* ─── Skeleton ─── */
function CateringSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-12 w-56 bg-surface-container rounded-xl" />
          <div className="mt-2 h-4 w-72 bg-surface-container rounded-lg" />
        </div>
        <div className="h-12 w-40 bg-surface-container rounded-full" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-28 bg-surface-container rounded-full" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-6 w-32 bg-surface-container rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map((j) => (
              <div key={j} className="h-32 bg-surface-container-low rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CateringPage() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [beverages, setBeverages] = useState<MenuBeverageType[]>([]);
  const [cateringNotes, setCateringNotes] = useState<CateringNoteType[]>([]);
  const [culturalStyle, setCulturalStyle] = useState<CulturalStyle>("CLASSIC_BRITISH");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("foods");
  const [saving, setSaving] = useState(false);

  // Filter state for beverages tab
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [alcoholFilter, setAlcoholFilter] = useState<AlcoholFilter>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"food" | "beverage" | "note">("food");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [foodForm, setFoodForm] = useState(defaultFoodForm);
  const [beverageForm, setBeverageForm] = useState(defaultBeverageForm);
  const [noteForm, setNoteForm] = useState(defaultNoteForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/catering");
      const data = await res.json();
      if (data.menuItems) setMenuItems(data.menuItems);
      if (data.menuBeverages) setBeverages(data.menuBeverages);
      if (data.cateringNotes) setCateringNotes(data.cateringNotes);
      if (data.culturalStyle) setCulturalStyle(data.culturalStyle as CulturalStyle);
    } catch {
      // silently fail
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise((r) => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  };

  /* ─── Modal Openers ─── */

  const openAddFood = (category?: MenuItemType["category"]) => {
    setEditingId(null);
    setModalType("food");
    setFoodForm({ ...defaultFoodForm, category: category || "APPETIZER" });
    setModalOpen(true);
  };

  const openEditFood = (item: MenuItemType) => {
    setEditingId(item.id);
    setModalType("food");
    setFoodForm({
      name: item.name,
      category: item.category,
      description: item.description || "",
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      isGlutenFree: item.isGlutenFree,
      notes: item.notes || "",
    });
    setModalOpen(true);
  };

  const openAddBeverage = (category?: MenuBeverageType["category"]) => {
    setEditingId(null);
    setModalType("beverage");
    setBeverageForm({ ...defaultBeverageForm, category: category || "COCKTAIL" });
    setModalOpen(true);
  };

  const openEditBeverage = (item: MenuBeverageType) => {
    setEditingId(item.id);
    setModalType("beverage");
    setBeverageForm({
      name: item.name,
      category: item.category,
      description: item.description || "",
      vendor: item.vendor || "",
      isAlcoholic: item.isAlcoholic,
      notes: item.notes || "",
    });
    setModalOpen(true);
  };

  const openAddNote = () => {
    setEditingId(null);
    setModalType("note");
    setNoteForm(defaultNoteForm);
    setModalOpen(true);
  };

  const openEditNote = (note: CateringNoteType) => {
    setEditingId(note.id);
    setModalType("note");
    setNoteForm({ content: note.content });
    setModalOpen(true);
  };

  /* ─── Submit ─── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        // PATCH
        let payload: Record<string, unknown> = {};
        if (modalType === "food") {
          payload = {
            name: foodForm.name,
            category: foodForm.category,
            description: foodForm.description || null,
            isVegetarian: foodForm.isVegetarian,
            isVegan: foodForm.isVegan,
            isGlutenFree: foodForm.isGlutenFree,
            notes: foodForm.notes || null,
          };
        } else if (modalType === "beverage") {
          payload = {
            name: beverageForm.name,
            category: beverageForm.category,
            description: beverageForm.description || null,
            vendor: beverageForm.vendor || null,
            isAlcoholic: culturalStyle === "ARAB" ? false : beverageForm.isAlcoholic,
            notes: beverageForm.notes || null,
          };
        } else {
          payload = { content: noteForm.content };
        }

        const res = await fetch(`/api/catering/${editingId}?type=${modalType === "food" ? "food" : modalType === "beverage" ? "beverage" : "note"}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchData();
          closeModal();
        }
      } else {
        // POST
        let payload: Record<string, unknown> = {};
        if (modalType === "food") {
          payload = {
            type: "food",
            name: foodForm.name,
            category: foodForm.category,
            description: foodForm.description || null,
            isVegetarian: foodForm.isVegetarian,
            isVegan: foodForm.isVegan,
            isGlutenFree: foodForm.isGlutenFree,
            notes: foodForm.notes || null,
          };
        } else if (modalType === "beverage") {
          payload = {
            type: "beverage",
            name: beverageForm.name,
            category: beverageForm.category,
            description: beverageForm.description || null,
            vendor: beverageForm.vendor || null,
            isAlcoholic: culturalStyle === "ARAB" ? false : beverageForm.isAlcoholic,
            notes: beverageForm.notes || null,
          };
        } else {
          payload = { type: "note", content: noteForm.content };
        }

        const res = await fetch("/api/catering", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          // Reset active filters so the user always sees their newly added item.
          if (modalType === "food") setDietFilter("all");
          if (modalType === "beverage") {
            setAlcoholFilter("all");
            setVendorFilter("all");
          }
          fetchData();
          closeModal();
        }
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  /* ─── Delete ─── */

  const handleDeleteFood = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    try {
      const res = await fetch(`/api/catering/${id}?type=food`, { method: "DELETE" });
      if (res.ok) setMenuItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleDeleteBeverage = async (id: string) => {
    if (!confirm("Delete this beverage?")) return;
    try {
      const res = await fetch(`/api/catering/${id}?type=beverage`, { method: "DELETE" });
      if (res.ok) setBeverages((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/catering/${id}?type=note`, { method: "DELETE" });
      if (res.ok) setCateringNotes((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // silently fail
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFoodForm(defaultFoodForm);
    setBeverageForm(defaultBeverageForm);
    setNoteForm(defaultNoteForm);
  };

  if (loading) return <CateringSkeleton />;

  const FOOD_CATEGORIES = foodCategoriesFor(culturalStyle);
  const isArab = culturalStyle === "ARAB";

  // Vendors list for filter dropdown
  const vendorOptions = Array.from(
    new Set(beverages.map((b) => b.vendor).filter((v): v is string => !!v))
  );

  // Filtered beverages
  const filteredBeverages = beverages.filter((b) => {
    if (alcoholFilter === "alcoholic" && !b.isAlcoholic) return false;
    if (alcoholFilter === "non-alcoholic" && b.isAlcoholic) return false;
    if (vendorFilter !== "all" && b.vendor !== vendorFilter) return false;
    return true;
  });

  // Filtered menu items by diet
  const filteredMenuItems = menuItems.filter((m) => {
    if (dietFilter === "vegetarian" && !m.isVegetarian) return false;
    if (dietFilter === "vegan" && !m.isVegan) return false;
    if (dietFilter === "glutenFree" && !m.isGlutenFree) return false;
    return true;
  });

  const handleQuickAddBeverage = async (sug: { name: string; category: MenuBeverageType["category"]; isAlcoholic: boolean }) => {
    const payload = {
      type: "beverage",
      name: sug.name,
      category: sug.category,
      isAlcoholic: isArab ? false : sug.isAlcoholic,
      vendor: null,
      description: null,
      notes: null,
    };
    try {
      const res = await fetch("/api/catering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setAlcoholFilter("all");
        setVendorFilter("all");
        fetchData();
      }
    } catch {
      // silently fail
    }
  };

  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: "foods", label: "Foods", icon: "restaurant_menu" },
    { key: "beverages", label: "Beverages", icon: "local_bar" },
    { key: "notes", label: "Special Notes", icon: "sticky_note_2" },
  ];

  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Menu Planning
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant font-label">
            Plan your wedding menu, drinks, and dietary requirements
          </p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "foods") openAddFood();
            else if (activeTab === "beverages") openAddBeverage();
            else openAddNote();
          }}
          className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon name="add" className="text-lg" />
          {activeTab === "foods" ? "Add Dish" : activeTab === "beverages" ? "Add Drink" : "Add Note"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-full text-sm font-label font-medium transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === tab.key
                ? "gold-gradient text-white shadow-md"
                : "bg-surface-container-low text-on-surface-variant hover:text-primary ghost-border"
            }`}
          >
            <Icon name={tab.icon} className="text-base" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Foods Tab ─── */}
      {activeTab === "foods" && (
        <div className="space-y-8">
          {/* Diet filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-on-surface-variant/70 font-label font-semibold mr-1">
              Filter:
            </span>
            {(["all", "vegetarian", "vegan", "glutenFree"] as DietFilter[]).map((f) => {
              const labels: Record<DietFilter, string> = {
                all: "All",
                vegetarian: "Vegetarian",
                vegan: "Vegan",
                glutenFree: "Gluten-Free",
                halal: "Halal",
              };
              const active = dietFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setDietFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-label font-medium transition-all cursor-pointer ${
                    active
                      ? "gold-gradient text-white shadow-md"
                      : "bg-surface-container-low text-on-surface-variant hover:text-primary ghost-border"
                  }`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          {FOOD_CATEGORIES.map((cat) => {
            const items = filteredMenuItems.filter((i) => i.category === cat.value);
            return (
              <div key={cat.value}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon name={cat.icon} className="text-primary/70" />
                    <h2 className="font-headline text-xl text-on-surface">{cat.label}</h2>
                    <span className="text-xs text-on-surface-variant/60 font-label">({items.length})</span>
                  </div>
                  <button
                    onClick={() => openAddFood(cat.value as MenuItemType["category"])}
                    className="text-xs font-label text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="add" className="text-sm" />
                    Add
                  </button>
                </div>

                {items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border group hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-headline text-lg text-on-surface">{item.name}</h3>
                          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditFood(item)}
                              className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant/50 hover:text-primary transition-all cursor-pointer"
                            >
                              <Icon name="edit" className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteFood(item.id)}
                              className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant/50 hover:text-error transition-all cursor-pointer"
                            >
                              <Icon name="delete" className="text-sm" />
                            </button>
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-xs text-on-surface-variant/70 mb-3 leading-relaxed">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {item.isVegetarian && (
                            <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-label font-medium">V</span>
                          )}
                          {item.isVegan && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-label font-medium">VG</span>
                          )}
                          {item.isGlutenFree && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-label font-medium">GF</span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-on-surface-variant/50 italic">{item.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center">
                    <Icon name={cat.icon} className="text-3xl gold-gradient-text mb-2 block" />
                    <p className="text-sm text-on-surface-variant/60 font-label">No {cat.label.toLowerCase()} yet</p>
                  </div>
                )}
              </div>
            );
          })}

          {menuItems.length === 0 && (
            <div className="text-center py-12">
              <Icon name="restaurant_menu" className="text-5xl text-primary/30 mb-4 block" />
              <p className="font-headline text-xl text-on-surface-variant">No menu items yet</p>
              <p className="text-sm text-on-surface-variant/60 mt-1 font-label">
                Start planning your wedding menu by adding dishes
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Beverages Tab ─── */}
      {activeTab === "beverages" && (
        <div className="space-y-6">
          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-on-surface-variant/70 font-label font-semibold">
              Filter:
            </span>
            {!isArab && (
              <div className="flex flex-wrap gap-2">
                {(["all", "alcoholic", "non-alcoholic"] as AlcoholFilter[]).map((f) => {
                  const labels: Record<AlcoholFilter, string> = {
                    all: "All",
                    alcoholic: "Alcoholic",
                    "non-alcoholic": "Non-Alcoholic",
                  };
                  const active = alcoholFilter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setAlcoholFilter(f)}
                      className={`px-4 py-1.5 rounded-full text-xs font-label font-medium transition-all cursor-pointer ${
                        active
                          ? "gold-gradient text-white shadow-md"
                          : "bg-surface-container-low text-on-surface-variant hover:text-primary ghost-border"
                      }`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
            )}

            {vendorOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-label text-on-surface-variant/60">Vendor:</span>
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="bg-surface-container-low rounded-full ghost-border px-3 py-1.5 text-xs font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="all">All</option>
                  {vendorOptions.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Suggested beverages quick-add (only when empty) */}
          {beverages.length === 0 && (
            <div className="bg-primary/5 rounded-2xl ghost-border p-5">
              <p className="text-xs uppercase tracking-wider text-primary font-label font-semibold mb-3">
                {isArab ? "Suggested Arab beverages" : culturalStyle === "CLASSIC_ASIAN" ? "Suggested Asian beverages" : "Suggested British beverages"}
              </p>
              <div className="flex flex-wrap gap-2">
                {beverageSuggestions[culturalStyle].map((sug) => (
                  <button
                    key={sug.name}
                    onClick={() => handleQuickAddBeverage(sug)}
                    className="px-3 py-1.5 rounded-full bg-surface-container-lowest ghost-border text-xs font-label text-on-surface hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="add" className="text-sm text-primary" />
                    {sug.name}
                  </button>
                ))}
              </div>
              <p className="text-xs font-label text-on-surface-variant/60 mt-3">
                Click a suggestion to add it instantly. You can edit or delete it after.
              </p>
            </div>
          )}

          {/* Beverages table */}
          {filteredBeverages.length > 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant/15">
                      <th className="px-5 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                        Drink
                      </th>
                      {!isArab && (
                        <th className="px-5 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Type
                        </th>
                      )}
                      {culturalStyle === "CLASSIC_BRITISH" && (
                        <th className="px-5 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Alcohol
                        </th>
                      )}
                      <th className="px-5 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-5 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-5 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBeverages.map((b, i) => (
                      <tr
                        key={b.id}
                        className={`border-b border-outline-variant/10 hover:bg-surface-container-low/30 transition-colors group ${
                          i === filteredBeverages.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5 text-sm font-label font-medium text-on-surface">
                          {b.name}
                          {b.description && (
                            <p className="text-xs font-label text-on-surface-variant/60 mt-0.5">
                              {b.description}
                            </p>
                          )}
                        </td>
                        {!isArab && (
                          <td className="px-5 py-3.5 text-sm font-label text-on-surface-variant">
                            {beverageTypeLabel(b)}
                          </td>
                        )}
                        {culturalStyle === "CLASSIC_BRITISH" && (
                          <td className="px-5 py-3.5">
                            <span
                              className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
                                b.isAlcoholic
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {b.isAlcoholic ? "Yes" : "No"}
                            </span>
                          </td>
                        )}
                        <td className="px-5 py-3.5 text-sm font-label text-on-surface-variant">
                          {b.vendor || <span className="text-on-surface-variant/40">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-label text-on-surface-variant max-w-[260px]">
                          {b.notes ? (
                            <span className="line-clamp-2">{b.notes}</span>
                          ) : (
                            <span className="text-on-surface-variant/40">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditBeverage(b)}
                              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant/50 hover:text-primary transition-all cursor-pointer"
                              aria-label="Edit"
                            >
                              <Icon name="edit" className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDeleteBeverage(b.id)}
                              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant/50 hover:text-error transition-all cursor-pointer"
                              aria-label="Delete"
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
              <div className="px-5 py-3 border-t border-outline-variant/10 flex items-center justify-between">
                <p className="text-xs font-label text-on-surface-variant/60">
                  {filteredBeverages.length} of {beverages.length} drinks shown
                </p>
                <button
                  onClick={() => openAddBeverage()}
                  className="text-xs font-label text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="add" className="text-sm" />
                  Add Drink
                </button>
              </div>
            </div>
          ) : (
            beverages.length > 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center">
                <p className="text-sm text-on-surface-variant/60 font-label">
                  No drinks match the current filters.
                </p>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* ─── Notes Tab ─── */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          {cateringNotes.length > 0 ? (
            cateringNotes.map((note) => (
              <div
                key={note.id}
                className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border group hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-on-surface leading-relaxed flex-1">{note.content}</p>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEditNote(note)}
                      className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant/50 hover:text-primary transition-all cursor-pointer"
                    >
                      <Icon name="edit" className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant/50 hover:text-error transition-all cursor-pointer"
                    >
                      <Icon name="delete" className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <Icon name="sticky_note_2" className="text-5xl text-primary/30 mb-4 block" />
              <p className="font-headline text-xl text-on-surface-variant">No special notes yet</p>
              <p className="text-sm text-on-surface-variant/60 mt-1 font-label">
                Add dietary requirements, allergies, or special requests
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Add/Edit Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingId
                ? modalType === "food"
                  ? "Edit Dish"
                  : modalType === "beverage"
                  ? "Edit Drink"
                  : "Edit Note"
                : modalType === "food"
                ? "Add New Dish"
                : modalType === "beverage"
                ? "Add New Drink"
                : "Add Special Note"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ─── Food Form ─── */}
              {modalType === "food" && (
                <>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={foodForm.name}
                      onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="e.g. Lamb Biryani"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                      Category
                    </label>
                    <select
                      value={foodForm.category}
                      onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value as MenuItemType["category"] })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      {FOOD_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                      Description
                    </label>
                    <textarea
                      value={foodForm.description}
                      onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      rows={2}
                      placeholder="Optional description..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={foodForm.isVegetarian}
                        onChange={(e) => setFoodForm({ ...foodForm, isVegetarian: e.target.checked })}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-sm font-label text-on-surface-variant">Vegetarian</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={foodForm.isVegan}
                        onChange={(e) => setFoodForm({ ...foodForm, isVegan: e.target.checked })}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-sm font-label text-on-surface-variant">Vegan</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={foodForm.isGlutenFree}
                        onChange={(e) => setFoodForm({ ...foodForm, isGlutenFree: e.target.checked })}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-sm font-label text-on-surface-variant">Gluten-Free</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                      Notes
                    </label>
                    <textarea
                      value={foodForm.notes}
                      onChange={(e) => setFoodForm({ ...foodForm, notes: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      rows={2}
                      placeholder="Any additional notes..."
                    />
                  </div>
                </>
              )}

              {/* ─── Beverage Form ─── */}
              {modalType === "beverage" && (
                <>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={beverageForm.name}
                      onChange={(e) => setBeverageForm({ ...beverageForm, name: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="e.g. Rose Prosecco"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                      Category
                    </label>
                    <select
                      value={beverageForm.category}
                      onChange={(e) => setBeverageForm({ ...beverageForm, category: e.target.value as MenuBeverageType["category"] })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      {BEVERAGE_CATEGORIES.filter((c) => !(isArab && c.value === "WINE")).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={beverageForm.vendor}
                      onChange={(e) => setBeverageForm({ ...beverageForm, vendor: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="e.g. Bella Catering, Mixology Co."
                    />
                  </div>
                  {!isArab && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={beverageForm.isAlcoholic}
                        onChange={(e) => setBeverageForm({ ...beverageForm, isAlcoholic: e.target.checked })}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-sm font-label text-on-surface-variant">
                        Contains alcohol
                      </span>
                    </label>
                  )}
                  {isArab && (
                    <p className="text-xs font-label text-on-surface-variant/60 italic px-1">
                      Alcoholic drinks are hidden for Arab weddings.
                    </p>
                  )}
                  <div>
                    <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                      Description
                    </label>
                    <textarea
                      value={beverageForm.description}
                      onChange={(e) => setBeverageForm({ ...beverageForm, description: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      rows={2}
                      placeholder="Optional description..."
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                      Notes
                    </label>
                    <textarea
                      value={beverageForm.notes}
                      onChange={(e) => setBeverageForm({ ...beverageForm, notes: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      rows={2}
                      placeholder="Any additional notes..."
                    />
                  </div>
                </>
              )}

              {/* ─── Note Form ─── */}
              {modalType === "note" && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Note
                  </label>
                  <textarea
                    required
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ content: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    rows={4}
                    placeholder="e.g. No shellfish for the bride's family, nut-free table required..."
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Add"}
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
