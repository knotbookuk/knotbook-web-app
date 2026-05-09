import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create demo user
  const passwordHash = await hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "emily@knotbook.com" },
    update: {},
    create: {
      email: "emily@knotbook.com",
      passwordHash,
      name: "Emily Parker",
      role: "USER",
      subscription: {
        create: {
          plan: "LIFETIME",
          status: "ACTIVE",
          billingHistory: {
            create: {
              amount: 16.99,
              currency: "GBP",
              description: "Lifetime Access - One-time payment",
              paidAt: new Date("2026-03-15"),
            },
          },
        },
      },
      wedding: {
        create: {
          culturalStyle: "CLASSIC_ASIAN",
          weddingDate: new Date("2026-08-15"),
          partnerName1: "Emily",
          partnerName2: "James",
          totalBudget: 45000,
          venue: "Syon House, London",
          events: {
            create: [
              {
                name: "Mehndi Night",
                description: "Traditional henna ceremony with family and friends",
                date: new Date("2026-08-12"),
                startTime: "18:00",
                endTime: "23:00",
                venue: "The Grand Ballroom",
                dayLabel: "Day 1",
                sortOrder: 1,
              },
              {
                name: "Nikah Ceremony",
                description: "Islamic marriage ceremony",
                date: new Date("2026-08-13"),
                startTime: "14:00",
                endTime: "16:00",
                venue: "Syon House Conservatory",
                dayLabel: "Day 2",
                sortOrder: 2,
              },
              {
                name: "Walima Reception",
                description: "Grand wedding reception and dinner",
                date: new Date("2026-08-14"),
                startTime: "18:00",
                endTime: "00:00",
                venue: "Syon House Great Hall",
                dayLabel: "Day 3",
                sortOrder: 3,
              },
              {
                name: "Baraat Procession",
                description: "Groom's procession and arrival ceremony",
                date: new Date("2026-08-14"),
                startTime: "12:00",
                endTime: "14:00",
                venue: "Syon House Gardens",
                dayLabel: "Day 3",
                sortOrder: 4,
              },
              {
                name: "Reception Party",
                description: "Evening celebration with music and dancing",
                date: new Date("2026-08-15"),
                startTime: "19:00",
                endTime: "02:00",
                venue: "The Langham, London",
                dayLabel: "Day 4",
                sortOrder: 5,
              },
              {
                name: "Farewell Brunch",
                description: "Intimate morning gathering for close family",
                date: new Date("2026-08-16"),
                startTime: "10:00",
                endTime: "13:00",
                venue: "Claridge's",
                dayLabel: "Day 5",
                sortOrder: 6,
              },
            ],
          },
          guests: {
            create: [
              { name: "Sarah Miller", email: "sarah@example.com", familySide: "BRIDE", rsvpStatus: "ATTENDING", mealPreference: "Wild Mushroom Risotto (V)", dietaryType: "Vegetarian" },
              { name: "James Hudson", email: "james.h@example.com", familySide: "GROOM", rsvpStatus: "NOT_COMING" },
              { name: "Emma Lawrence", email: "emma.l@example.com", familySide: "BRIDE", rsvpStatus: "NO_RESPONSE" },
              { name: "David Wright", email: "david.w@example.com", familySide: "GROOM", rsvpStatus: "ATTENDING", mealPreference: "Filet Mignon (GF)", dietaryType: "Gluten-Free" },
              { name: "Priya Sharma", email: "priya@example.com", familySide: "BRIDE", rsvpStatus: "ATTENDING", mealPreference: "Paneer Tikka (V)", dietaryType: "Vegetarian" },
              { name: "Omar Khan", email: "omar@example.com", familySide: "GROOM", rsvpStatus: "ATTENDING", mealPreference: "Lamb Biryani", allergies: "Tree nuts", allergySeverity: "HIGH" },
              { name: "Fatima Ali", email: "fatima@example.com", familySide: "BRIDE", rsvpStatus: "ATTENDING", mealPreference: "Chicken Karahi", dietaryType: "Halal" },
              { name: "Robert Chen", email: "robert@example.com", familySide: "GROOM", rsvpStatus: "NO_RESPONSE" },
              { name: "Aisha Begum", email: "aisha@example.com", familySide: "BRIDE", rsvpStatus: "ATTENDING", mealPreference: "Vegan Platter", dietaryType: "Vegan" },
              { name: "Michael Brooks", email: "michael@example.com", familySide: "GROOM", rsvpStatus: "ATTENDING", mealPreference: "Beef Wellington" },
            ],
          },
          budgetItems: {
            create: [
              { category: "Venue & Catering", estimatedCost: 12000, actualCost: 12200, paidAmount: 8000, dueDate: new Date("2026-05-15"), status: "DUE" },
              { category: "Photography", estimatedCost: 4500, actualCost: 4300, paidAmount: 4300, status: "PAID" },
              { category: "Flowers & Decor", estimatedCost: 3500, actualCost: 3100, paidAmount: 500, dueDate: new Date("2026-06-01"), status: "PARTIALLY_PAID" },
              { category: "Entertainment", estimatedCost: 2000, actualCost: 1850, paidAmount: 1850, status: "PAID" },
              { category: "Wedding Attire", estimatedCost: 5000, actualCost: 4800, paidAmount: 2400, dueDate: new Date("2026-07-01"), status: "PARTIALLY_PAID" },
              { category: "Invitations & Stationery", estimatedCost: 800, actualCost: 750, paidAmount: 750, status: "PAID" },
            ],
          },
          vendors: {
            create: [
              {
                name: "Lumière Studios",
                category: "Photography",
                contactName: "Alex Turner",
                email: "alex@lumiere.co.uk",
                phone: "+44 7700 900123",
                quoteAmount: 4500,
                depositAmount: 1500,
                rating: 5,
                status: "PAID_IN_FULL",
                payments: {
                  create: [
                    { amount: 1500, description: "Deposit", dueDate: new Date("2026-01-15"), paidDate: new Date("2026-01-15"), status: "PAID" },
                    { amount: 3000, description: "Final payment", dueDate: new Date("2026-07-15"), paidDate: new Date("2026-07-15"), status: "PAID" },
                  ],
                },
              },
              {
                name: "The Bloom Room",
                category: "Florist",
                contactName: "Sophie Green",
                email: "sophie@bloomroom.co.uk",
                phone: "+44 7700 900456",
                quoteAmount: 3500,
                depositAmount: 1000,
                rating: 4,
                status: "DEPOSIT_PAID",
                payments: {
                  create: [
                    { amount: 1000, description: "Deposit", dueDate: new Date("2026-02-01"), paidDate: new Date("2026-02-01"), status: "PAID" },
                    { amount: 2500, description: "Balance", dueDate: new Date("2026-06-01"), status: "PENDING" },
                  ],
                },
              },
              {
                name: "Syon House Events",
                category: "Venue",
                contactName: "Charlotte Williams",
                email: "events@syonhouse.co.uk",
                phone: "+44 20 8560 0882",
                quoteAmount: 12000,
                depositAmount: 4000,
                rating: 5,
                status: "CONFIRMED",
                payments: {
                  create: [
                    { amount: 4000, description: "Venue deposit", dueDate: new Date("2025-12-01"), paidDate: new Date("2025-12-01"), status: "PAID" },
                    { amount: 4000, description: "Second installment", dueDate: new Date("2026-05-15"), status: "PENDING" },
                    { amount: 4000, description: "Final balance", dueDate: new Date("2026-08-01"), status: "PENDING" },
                  ],
                },
              },
            ],
          },
          seatingTables: {
            create: [
              { name: "Table 1 - Head Table", capacity: 10 },
              { name: "Table 2 - Bride's Family", capacity: 10 },
              { name: "Table 3 - Groom's Family", capacity: 10 },
              { name: "Table 4 - Friends", capacity: 8 },
              { name: "Table 5 - Colleagues", capacity: 8 },
              { name: "Table 6 - Extended Family", capacity: 10 },
            ],
          },
          tasks: {
            create: [
              { title: "Finalise guest list", description: "Final head count needed for catering", assigneeName: "Emily", dueDate: new Date("2026-05-15"), priority: "HIGH", status: "TODO", category: "Planning" },
              { title: "Send out invitations", description: "Check addresses for international guests", assigneeName: "James", dueDate: new Date("2026-05-27"), priority: "HIGH", status: "TODO" },
              { title: "Cake tasting appointment", description: "Sweet Delights Bakery at 3pm", assigneeName: "Emily", dueDate: new Date("2026-06-08"), priority: "MEDIUM", status: "TODO" },
              { title: "Book henna artist", description: "Confirm design options for mehndi night", assigneeName: "Mum", dueDate: new Date("2026-06-15"), priority: "MEDIUM", status: "IN_PROGRESS" },
              { title: "Arrange airport transfers", description: "For guests flying in from Pakistan", assigneeName: "Dad", dueDate: new Date("2026-07-01"), priority: "LOW", status: "TODO" },
              { title: "Book videographer", description: "Confirmed with CineLove Films", assigneeName: "James", priority: "HIGH", status: "COMPLETED", completedAt: new Date("2026-03-20") },
              { title: "Set wedding date", description: "Ceremony scheduled for August 15", assigneeName: "Emily & James", priority: "HIGH", status: "COMPLETED", completedAt: new Date("2025-12-12") },
              { title: "Book venue", description: "Syon House confirmed, deposit paid", assigneeName: "Emily", priority: "HIGH", status: "COMPLETED", completedAt: new Date("2026-01-05") },
              { title: "Hire photographer", description: "Lumière Studios portfolio approved", assigneeName: "James", priority: "HIGH", status: "COMPLETED", completedAt: new Date("2026-02-18") },
            ],
          },
          checklistItems: {
            create: [
              { title: "Set wedding date", category: "Ceremony", isCompleted: true, completedAt: new Date("2025-12-12"), sortOrder: 1 },
              { title: "Book a venue", category: "Ceremony", isCompleted: true, completedAt: new Date("2026-01-05"), sortOrder: 2 },
              { title: "Hire a photographer", category: "Vendors", isCompleted: true, completedAt: new Date("2026-02-18"), sortOrder: 3 },
              { title: "Finalise guest list", category: "Guests", isCompleted: false, dueDate: new Date("2026-05-15"), sortOrder: 4 },
              { title: "Send out invitations", category: "Stationery", isCompleted: false, dueDate: new Date("2026-05-27"), sortOrder: 5 },
              { title: "Cake tasting", category: "Catering", isCompleted: false, dueDate: new Date("2026-06-08"), sortOrder: 6 },
              { title: "Final dress fitting", category: "Attire", isCompleted: false, dueDate: new Date("2026-07-20"), sortOrder: 7 },
              { title: "Confirm seating arrangement", category: "Planning", isCompleted: false, dueDate: new Date("2026-08-01"), sortOrder: 8 },
            ],
          },
          moodBoardItems: {
            create: [
              { title: "Rose Gold Table Setting", category: "Table Settings", tags: ["gold", "elegant", "reception"] },
              { title: "White Orchid Centrepieces", category: "Floral", tags: ["white", "orchids", "centrepiece"] },
              { title: "Mehndi Stage Decor", category: "Decor", tags: ["mehndi", "stage", "traditional"] },
              { title: "Bridal Lehenga Inspiration", category: "Outfits", tags: ["bridal", "lehenga", "red"] },
              { title: "Garden Ceremony Setup", category: "Venue", tags: ["outdoor", "garden", "ceremony"] },
              { title: "Gold Charger Plates", category: "Table Settings", tags: ["gold", "charger", "dining"] },
            ],
          },
        },
      },
    },
  });

  // Create test user (Ali)
  const aliHash = await hash("Kn0tB00k!2026#Secure", 12);
  await prisma.user.upsert({
    where: { email: "ali@knotbook.co.uk" },
    update: {},
    create: {
      email: "ali@knotbook.co.uk",
      passwordHash: aliHash,
      name: "Ali Azlan",
      role: "ADMIN",
    },
  });

  // Create notifications for user
  await prisma.notification.createMany({
    data: [
      { userId: user.id, type: "RSVP_UPDATE", title: "New RSVP", message: "Sarah Miller confirmed attendance for the reception.", isRead: false },
      { userId: user.id, type: "PAYMENT_REMINDER", title: "Payment Due", message: "Venue deposit of £4,200 due on May 15th.", isRead: false },
      { userId: user.id, type: "TASK_DUE", title: "Task Reminder", message: "Finalise guest list is due in 2 days.", isRead: false },
      { userId: user.id, type: "VENDOR_MESSAGE", title: "Vendor Update", message: "The Bloom Room has sent updated flower arrangements.", isRead: true },
      { userId: user.id, type: "EVENT_REMINDER", title: "Upcoming Event", message: "Final menu tasting at Syon House in 5 days.", isRead: true },
    ],
  });

  console.log("Seed complete: demo user emily@knotbook.com / demo1234");
  console.log("Seed complete: test user ali@knotbook.co.uk / Kn0tB00k!2026#Secure");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
