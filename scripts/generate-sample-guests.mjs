// Generates a realistic 200-row guest CSV for testing the import flow,
// guest table, seating, RSVP filters etc. UK-Asian wedding context.
// Usage: node scripts/generate-sample-guests.mjs > docs/sample-guests-200.csv

import { writeFileSync } from "node:fs";

const firstNamesM = [
  "Ali", "Omar", "Hassan", "Imran", "Faisal", "Ahmed", "Bilal", "Yusuf",
  "Ibrahim", "Khalid", "Tariq", "Zain", "Hamza", "Daniel", "James", "Tom",
  "Oliver", "Harry", "George", "William", "Arjun", "Raj", "Vikram", "Karan",
  "Sahil", "Dev", "Nikhil", "Aman", "Rohan", "Aarav",
];
const firstNamesF = [
  "Aisha", "Layla", "Fatima", "Mariam", "Sana", "Zara", "Noor", "Hana",
  "Amira", "Yasmin", "Sophie", "Emma", "Olivia", "Charlotte", "Amelia",
  "Isla", "Mia", "Ava", "Priya", "Aanya", "Diya", "Riya", "Meera", "Saanvi",
  "Kavya", "Anika", "Tara", "Nisha", "Pooja", "Anjali",
];
const surnames = [
  "Khan", "Ali", "Hussain", "Ahmed", "Patel", "Shah", "Singh", "Sharma",
  "Kapoor", "Malhotra", "Smith", "Jones", "Williams", "Brown", "Taylor",
  "Wilson", "Davies", "Evans", "Thomas", "Roberts", "Hassan", "Iqbal",
  "Mahmood", "Akhtar", "Sheikh", "Mirza", "Chaudhry", "Begum", "Aziz",
  "Rashid", "Mehta", "Verma", "Joshi", "Reddy",
];
const cities = [
  "London", "Birmingham", "Manchester", "Leeds", "Bradford", "Glasgow",
  "Edinburgh", "Bristol", "Cardiff", "Sheffield", "Liverpool", "Leicester",
  "Coventry", "Nottingham", "Luton", "Reading",
];
const meals = ["Standard", "Halal", "Kosher", "Vegetarian", "Vegan", ""];
const diets = ["", "", "", "", "Vegetarian", "Vegan", "Gluten-Free", "Pescatarian"];
const allergies = ["", "", "", "", "", "Nuts", "Dairy", "Shellfish", "Gluten", "Eggs"];
const familySides = ["BRIDE", "BRIDE", "GROOM", "GROOM", "MUTUAL"];
const rsvps = [
  "ATTENDING", "ATTENDING", "ATTENDING", "ATTENDING", "ATTENDING",
  "ATTENDING", "ATTENDING", "ATTENDING",
  "NOT_COMING", "NOT_COMING",
  "NO_RESPONSE", "NO_RESPONSE", "NO_RESPONSE",
];
const noteTemplates = [
  "",
  "",
  "",
  "",
  "VIP — bride's grandmother",
  "Travelling from abroad",
  "Wheelchair access required",
  "Plus-one is bringing a baby",
  "Prefers to sit with the Khan family",
  "Catering coordinator",
  "Photographer's table",
  "Religious observances — please seat near door",
  "Food allergy — see allergies field",
  "Late arrival expected",
  "Dietary requirements pre-confirmed",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(arr) {
  // arr already weighted by repetition above
  return pick(arr);
}

function ukMobile() {
  // +44 7xxx xxxxxx — valid UK mobile prefix
  const block1 = String(700 + Math.floor(Math.random() * 99));
  const block2 = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const block3 = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `+44 7${block1.slice(1)} ${block2}${block3}`;
}

function emailFor(first, last, idx) {
  const domains = ["gmail.com", "outlook.com", "icloud.com", "yahoo.co.uk", "hotmail.co.uk"];
  const slug = `${first.toLowerCase()}.${last.toLowerCase()}${idx > 0 ? idx : ""}`;
  return `${slug}@${pick(domains)}`;
}

const usedSlugs = new Set();
const rows = [];
rows.push([
  "Name",
  "Email",
  "Phone",
  "Family Side",
  "RSVP Status",
  "Meal Preference",
  "Dietary Type",
  "Allergies",
  "Additional Members",
  "Notes",
]);

for (let i = 0; i < 200; i++) {
  const isFemale = Math.random() < 0.5;
  const first = pick(isFemale ? firstNamesF : firstNamesM);
  const last = pick(surnames);
  const slug = `${first}.${last}`;
  let dupeIdx = 0;
  while (usedSlugs.has(`${slug}${dupeIdx}`)) dupeIdx++;
  usedSlugs.add(`${slug}${dupeIdx}`);

  const name = `${first} ${last}`;
  const hasEmail = Math.random() < 0.85;
  const hasPhone = Math.random() < 0.9;
  const familySide = pick(familySides);
  const rsvpStatus = pick(rsvps);
  const mealPreference = rsvpStatus === "ATTENDING" ? pick(meals) : "";
  const dietaryType = rsvpStatus === "ATTENDING" ? pick(diets) : "";
  const allergy = rsvpStatus === "ATTENDING" ? pick(allergies) : "";
  // Additional members: weighted toward 0
  const r = Math.random();
  const additionalMembers =
    rsvpStatus !== "ATTENDING"
      ? 0
      : r < 0.6
      ? 0
      : r < 0.85
      ? 1
      : r < 0.95
      ? 2
      : r < 0.99
      ? 3
      : 4;
  const note = pick(noteTemplates);
  const city = pick(cities);
  const noteFinal = note ? (Math.random() < 0.3 ? `${note} (${city})` : note) : "";

  rows.push([
    name,
    hasEmail ? emailFor(first, last, dupeIdx) : "",
    hasPhone ? ukMobile() : "",
    familySide,
    rsvpStatus,
    mealPreference,
    dietaryType,
    allergy,
    additionalMembers,
    noteFinal,
  ]);
}

function escape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
const out = process.argv[2] || "docs/sample-guests-200.csv";
writeFileSync(out, csv + "\n");
console.error(`Wrote ${rows.length - 1} guests to ${out}`);
