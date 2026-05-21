<div align="center">

# Greenroom

**Software for independent music venues.**

Settlement workflow tooling for The Crescent — 650-cap venue in Nashville.

</div>

---

## What this is

Greenroom helps Mariana Reyes (lead booker at The Crescent) go from raw ticket sales and expenses to a finalized artist payment — entirely inside the app, without a spreadsheet.

This repo extends the original starter codebase with a complete settlement engine, ticket reconciliation panel, and per-tier audit trail.

---

## What was built

### Settlement engine (`lib/dealMath.ts`)

The original engine only handled flat-fee deals. All 5 deal types are now supported:

| Deal type | How it works |
|---|---|
| `flat` | Fixed guarantee, no percentage |
| `percentage_of_gross` | % × gross box office |
| `percentage_of_net` | % × (gross − expenses) |
| `vs` | `max(guarantee, % × net)` — whichever is higher wins |
| `door` | Artist takes everything at the door (no venue guarantee) |

Expense cap logic is explicit: hospitality is sub-capped first, then the overall cap is applied. Any overage is flagged for the Recoups section — the root cause of the Coastal Spell $720 dispute.

The engine also detects free-text amendments in `dealNotesFreetext` (keywords like "renegotiated", "see email", "per the deal memo") and surfaces a warning when the structured fields may not reflect the actual deal.

### Ticket reconciliation panel (`app/shows/[id]/settle/page.tsx`)

Added to the settle page:

- **Sell-through bar** — tickets sold vs. venue capacity at a glance
- **Paid ticket math** — gross, fees, net per ticket sale row
- **Comps breakdown** — per category, with a note when comps count toward gross
- **Per-tier audit** — when `breakdown_json` is present on a ticket sale, each price tier (GA Presale, GA Door, VIP, etc.) is shown with qty × price
- **Discrepancy detection** — if the tier subtotal doesn't match the recorded gross (within $0.50), an amber warning appears so Mariana can investigate before sending the settlement

### Per-tier ticket data (`db/schema.ts`)

Added `breakdown_json` column to `ticket_sales`:

```
[{ tier: string, qty: number, price: number }]
```

Follows the same pattern as `bonuses_json`, `recoups_json`, and `calculation_json` already in the schema. Null-safe — shows without tier data fall back to aggregate display.

Four shows are seeded with tier data. `show_0002` has an intentional discrepancy (tier sum ≠ recorded gross) to demonstrate the amber warning.

### Date bug fix

`captured_at` is stored as midnight UTC. Reading it as a JavaScript `Date` in a UTC-6 timezone (Nashville) shifted ticket sale dates back one day. Fixed by parsing `show.date` as a local date string (`YYYY-MM-DD`) instead of relying on the timestamp.

---

## Setup

### Prerequisites

1. **Node.js 20+** — [nodejs.org](https://nodejs.org/) (LTS). Verify: `node -v`
2. **Git** — Verify: `git --version`
3. **A code editor** — [VS Code](https://code.visualstudio.com/) or [Cursor](https://cursor.com/)

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You're logged in as Mariana. Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux) for global search.

---

## Routes

| Route | What it is |
|---|---|
| `/shows` | 24 months of shows, searchable, grouped by month |
| `/shows/[id]` | Show detail — deal terms, artist info, ticket sales, expenses, comps |
| `/shows/[id]/settle` | Settlement worksheet with ticket reconciliation and expense breakdown |
| `/artists` | Artist roster bucketed by frequency |
| `/reports` | Aggregate metrics |
| `/context` | In-product orientation — start here |

---

## Recommended path

1. Open `/context` (sidebar → "Where to start")
2. Go to `/shows`, pick a **Vs-deal** show, click **Settle** — see the full calculation with expense transparency
3. Pick a show with ticket tier data (e.g. show `0002`) — see the per-tier audit and amber discrepancy warning
4. Read `data/transcripts/*.md` and `data/ceo-memo.md`
5. Press **⌘K**, search "Coastal Spell" — read `data/dispute-thread.md` alongside it

---

## Data context

```
data/
├── ceo-memo.md            # Pri's Q4 memo: "winning on completeness, losing on craft"
├── dispute-thread.md      # The March 2025 marketing-recoup dispute, in full
├── greenroom.db           # SQLite database — pre-seeded, ready to go
└── transcripts/
    ├── mariana.md         # 30-min interview with the booker
    ├── diego.md           # Tour manager perspective
    ├── marcus.md          # GM perspective
    └── sarah-kim.md       # Agent perspective (WME)
```

The `dealNotesFreetext` field is where Mariana actually writes deals. The structured fields (`guarantee_amount`, `percentage`, `bonuses_json`) are filled inconsistently — about half of deals with bonus structures use `bonuses_json`, the other half put it in prose only. That mismatch is intentional.

---

## File map

```
app/
  context/                  # Candidate orientation page
  shows/                    # Show list with search + month grouping
  shows/[id]/               # Show detail
  shows/[id]/settle/        # Settlement worksheet (hero number + reconciliation panels)
components/
  brand/logo.tsx
  command-palette/          # ⌘K global search
  ui/                       # Buttons, badges, cards
  layout/                   # Sidebar + nav
lib/
  dealMath.ts               # Settlement engine — all 5 deal types
  queries.ts                # Server-side data fetching
  format.ts                 # Money, date, percentage helpers
db/
  schema.ts                 # All tables + type exports
  seed.ts                   # 24-month synthetic seed
  index.ts                  # libsql + Drizzle client
data/                       # Markdown context + greenroom.db
```

---

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** with shadcn-style component primitives
- **Drizzle ORM** + **libsql** (pure-JS SQLite — no native compile, no setup)
- **Fraunces** (variable serif) for display headings
- **Geist Sans / Mono** for body + code
- **lucide-react** for icons, **date-fns** for dates

---

## Troubleshooting

### "Port 3000 is already in use"

```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Or run on a different port
npm run dev -- -p 3001
```

### "Module not found" or build errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### The database looks wrong or broken

```bash
npm run db:reset
```

Drops and regenerates 24 months of data. Deterministic — same data every time. Note: this will remove the `breakdown_json` tier data seeded for the discrepancy demo. Re-add it manually or via a migration if needed.

### Browse the database directly

```bash
npm run db:studio
```

Opens Drizzle Studio at `local.drizzle.studio`. You can also open `data/greenroom.db` with [TablePlus](https://tableplus.com/), [DBeaver](https://dbeaver.io/), or the `sqlite3` CLI.

---

Welcome to The Crescent.
