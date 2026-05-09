# Knotbook

A wedding planning platform for couples and professional wedding planners. Knotbook brings every part of wedding prep — guests, vendors, budget, checklists, outfits, menus, RSVPs — into one place, with role-based dashboards for couples and planners managing multiple weddings.

Live at [knotbook.co.uk](https://knotbook.co.uk).

## Features

### For couples
- **Dashboard** — at-a-glance view of countdown, budget, RSVPs, and upcoming tasks
- **Guest list & RSVPs** — manage invites, track responses via public RSVP links, dietary requirements, plus-ones
- **Vendors** — quote tracking, payment schedules, contact details, status pipeline
- **Budget** — category allocation, spend vs. quoted, configurable alert thresholds, email warnings as you approach limits
- **Checklists & tasks** — priority-based, due dates, persistent state
- **Outfits** — wardrobe planning per event with cost roll-ups
- **Menu planning** — courses, dietary tags, vendor links
- **Tracker** — single timeline view across all moving parts

### For planners (Pro)
- **Multi-wedding workspace** — switch between client weddings from one sidebar
- **Planner dashboard** — aggregated view across all active engagements
- **Per-wedding settings** — full access to each couple's tools

### Admin
- Role assignment (grant/revoke admin)
- Comp subscriptions (grant Pro without Stripe charge)
- User management, subscription oversight
- Email digest controls — manual cron triggers, test sends with sample data
- Stripe mode toggle (live/test) driven from the database

### System
- **Auth** — NextAuth with email/password, password reset
- **Payments** — Stripe subscriptions, live/test mode toggle, comp grants
- **Email** — Resend, grouped per-user digest reminders for vendors, payments, and budget alerts
- **Image uploads** — Cloudinary
- **Mobile** — responsive layouts, FAB navigation

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Prisma 7** + **PostgreSQL**
- **NextAuth** for auth
- **Stripe** for billing
- **Resend** for transactional email
- **Cloudinary** for image hosting
- **Tailwind CSS v4**
- Deployed on **Render**

## Getting started

```bash
npm install
cp .env.example .env   # fill in DB, Stripe, Resend, Cloudinary, NextAuth secrets
npm run db:push        # sync schema
npm run db:seed        # optional: seed sample data
npm run dev
```

App runs at `http://localhost:3000`.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Generate Prisma client + build Next.js |
| `npm run start` | Run production build |
| `npm run db:push` | Push schema to DB (no migration files) |
| `npm run db:migrate` | Create + apply a migration |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | ESLint |

## Project layout

```
src/app/
  admin/              # admin dashboard (users, subscriptions, emails, stripe mode)
  api/                # route handlers (auth, stripe, email crons, CRUD)
  dashboard/          # couple-side feature pages (budget, guests, vendors, ...)
  planner/            # planner-side multi-wedding workspace
  login/              # auth pages
  onboarding/         # post-signup flow
  rsvp/               # public RSVP links
  subscription-success/
prisma/
  schema.prisma
  seed.ts
```

## Deployment

Deploys to Render on push to `main`. The build script runs `prisma generate && next build`; schema sync happens via `prisma db push` in the Render build hook.

## License

Proprietary. All rights reserved.
