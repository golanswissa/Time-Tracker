# Tracker

A personal time-tracking web app. Clients → Projects → Entries, with editable hourly rates, monthly reports, and printable PDF export.

Built as a private, local-first alternative to Harvest — data lives in your browser (localStorage).

## Stack

- React 18 + TypeScript + Vite
- Zustand (with `persist` middleware) for state + localStorage
- Vercel-inspired design system (Geist font, shadow-as-border, monochrome with one green accent)
- No backend, no database, no auth — single-user, single-browser

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # output in dist/
npm run preview  # serve the built bundle locally
```

## Concepts

- **Clients** — the top of the hierarchy. Every project belongs to one client. Clients have an optional default hourly rate.
- **Projects** — belong to a client. Inherit the client's hourly rate by default; can override per-project.
- **Tasks** — categories of work (Development, Meetings, etc.). Global list.
- **Entries** — atomic time entries: one project + one task + notes + a date + a duration.
- **Reports** — per-client monthly summaries with editable per-month rate overrides. Export as PDF via browser print.

Rate precedence: `month override` → `project.hourlyRate` → `client.hourlyRate` → `0`.

## Data storage

Everything is stored in your browser under `localStorage['tracker:v1']`. Use **Settings → Export JSON** to back up, **Import JSON** to restore.

## Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages). On Vercel, connect this repo and default settings handle the rest.
