# Payment Ops Assistant

A CSV-driven payment operations dashboard: upload transaction exports, get
strict validation on every row, and browse the results through a dashboard,
a filterable transaction table, and a full import history.

## Why I built this

I wanted a portfolio project that looks like real fintech ops tooling, not
a CRUD tutorial — the kind of internal dashboard a payments team would
actually use to reconcile CSV exports from a processor, catch bad rows
before they hit reporting, and see at a glance what succeeded and what
needs investigation.

## Screenshots

![Dashboard](docs/screenshots/dashboard.png)
![Transactions](docs/screenshots/transactions.png)
![Imports](docs/screenshots/imports.png)
![Upload](docs/screenshots/upload.png)

## Architecture

```mermaid
flowchart LR
    subgraph Frontend [React + Vite]
        UI[Tab-based UI\nDashboard / Transactions / Imports / Upload]
    end

    subgraph Backend [Express API]
        Upload[POST /api/imports]
        List[GET /api/imports, /api/transactions]
        Summary[GET /api/transactions/summary]
        Validate[CSV parse + validation]
    end

    subgraph Data [PostgreSQL via Prisma 7]
        ImportT[(Import)]
        ErrorT[(ImportError)]
        TxnT[(Transaction)]
    end

    UI -->|multipart/form-data| Upload
    UI --> List
    UI --> Summary
    Upload --> Validate
    Validate --> ImportT
    Validate --> ErrorT
    Validate --> TxnT
    List --> ImportT
    List --> TxnT
    Summary --> TxnT
```

### Import flow

```mermaid
flowchart TD
    A[Upload CSV] --> B[Create Import record: status=PROCESSING]
    B --> C{File empty or\nnot .csv or >10MB?}
    C -- yes --> D[Mark FAILED, return 400/413]
    C -- no --> E[Parse rows]
    E --> F{Missing required\ncolumns?}
    F -- yes --> D
    F -- no --> G[Validate each row:\namount, currency, status,\ndate, column count, duplicates]
    G --> H[Save valid rows as Transactions\nlinked to this Import]
    G --> I[Save failed rows as ImportErrors\nwith row number + reason]
    H --> J[Update Import: status + counts]
    I --> J
    J --> K[Import history + row-level\nerrors visible in the UI]
```

## Technology stack

- **Frontend:** React 18 + Vite, TypeScript, plain CSS (no framework) —
  tab-based navigation via component state rather than a router
- **Backend:** Node.js + Express, TypeScript (run via `tsx`)
- **Database:** PostgreSQL, accessed through Prisma 7's new client
  generator with the `@prisma/adapter-pg` driver adapter
- **Uploads:** `multer` (memory storage, 10MB limit, `.csv`-only filter)

## Main features

- **CSV import with full validation** — missing columns, invalid/negative
  amounts, unsupported currencies, invalid statuses, invalid dates,
  malformed column counts, duplicate transaction IDs (within a file *and*
  against everything already in the database), empty files, non-CSV
  files, and oversized files (>10MB) are all caught and reported per row.
- **Import history** — every upload is tracked as an `Import` record with
  filename, status, row counts, and a linked list of row-level errors
  (`ImportError`), so nothing is ever silently dropped.
- **Transaction dashboard** — summary cards for total/successful/failed/
  pending transactions, total amount processed (successful transactions
  only), and success rate.
- **Transaction table** — server-side pagination, debounced search by
  transaction ID, status/currency filters, date range filter, and
  clickable sortable columns.
- **Graceful DB fallback** — if Postgres isn't reachable, the API falls
  back to an in-memory store instead of crashing, so the app stays usable
  for a quick demo even without a database running.

## Local setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local, Docker, or Prisma's own `prisma dev`
  managed local instance)

### 1. Install dependencies
```bash
cd apps/api && npm install
cd ../web && npm install
```

### 2. Configure environment variables
Create a `.env` file at the repo root:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/payment_ops"
```

### 3. Set up the database
```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Run the app
```bash
# terminal 1
cd apps/api && npm run dev   # http://localhost:3001

# terminal 2
cd apps/web && npm run dev   # Vite dev server, check terminal for port
```

## Environment variables

| Variable       | Required | Description                                  |
|----------------|----------|-----------------------------------------------|
| `DATABASE_URL` | Yes      | PostgreSQL connection string (Prisma + the API's driver adapter both read this) |
| `PORT`         | No       | API port, defaults to `3001`                  |

## API endpoints

| Method | Endpoint                    | Description |
|--------|------------------------------|--------------|
| `GET`  | `/health`                   | Health check |
| `POST` | `/api/imports`               | Upload a CSV (multipart `file` field) |
| `POST` | `/transactions/upload`       | Alias of the above |
| `GET`  | `/api/imports`               | Paginated import history — `page`, `pageSize`, `search`, `status`, `sortBy`, `sortOrder` |
| `GET`  | `/api/imports/:id`           | Single import with full row-level error list |
| `GET`  | `/api/transactions`          | Paginated transaction list — `page`, `pageSize`, `search`, `status`, `currency`, `dateFrom`, `dateTo`, `sortBy`, `sortOrder` |
| `GET`  | `/api/transactions/summary`  | Dashboard aggregate counts, total processed amount, success rate |

## Engineering decisions

- **Prisma 7 driver adapters, not a raw connection string.** Prisma 7's
  new client generator requires a driver adapter (`@prisma/adapter-pg`)
  rather than reading `url` directly from the schema — this tripped me
  up during setup (see commit history) and is worth knowing if you're on
  an older Prisma mental model.
- **Repository pattern for reads, inline logic for the upload handler.**
  `importRepository.ts` and `transactionsRepository.ts` isolate query/
  aggregation logic (and both support a Prisma-or-in-memory dual path)
  so the dashboard and table endpoints stay simple. The upload handler
  itself is intentionally more monolithic — the CSV → validate → save →
  update-counts sequence reads top-to-bottom in one place rather than
  being split across files, which matters more for a flow this order-
  sensitive.
- **Allow-lists for currency and status, not free-text.** A payments
  system that accepts any string as a "currency" isn't actually
  validating anything. `ALLOWED_CURRENCIES` / `ALLOWED_STATUSES` are
  small and explicit on purpose.
- **Ledger-style UI, not a generic admin template.** Monospace tabular
  numerals for amounts/IDs, a status-color-coded left border on table
  rows, and a dark sidebar were a deliberate choice to make this read as
  financial tooling rather than a CRUD scaffold.

## Trade-offs

- **No React Router.** Navigation is `useState` + conditional rendering
  across four tabs. Simpler for a project this size, but it means no
  deep-linking, no browser back-button support, and no per-page URLs.
  Worth revisiting if the app grows further.
- **Hand-rolled CSV line splitting**, not a parsing library like
  `csv-parse`. It handles quoted fields with embedded commas, but a
  battle-tested library would cover more edge cases (embedded newlines
  in quoted fields, BOM handling, etc.) with less custom code to
  maintain.
- **In-memory fallback duplicates logic.** Every endpoint that touches
  the database has a parallel in-memory code path for when Prisma isn't
  connected. This is good for demo resilience but is real duplicated
  logic that has to be kept in sync by hand — a larger app would
  probably drop this in favor of requiring a database.
- **Frontend API base URL is hardcoded** (`http://localhost:3001`)
  rather than read from an environment variable — fine for local
  development, would need fixing before any real deployment.

## Future improvements

- AI operations assistant (natural-language questions over transaction/
  failure data) — planned next
- Automated test suite (backend + frontend)
- Rate limiting on any AI endpoints
- Centralized error-handling middleware with request-ID logging
- Zod-based request/env validation
- Docker Compose for one-command setup
- GitHub Actions CI (typecheck, lint, test, build) on every PR
- Move the frontend API base URL to an environment variable
- Consider React Router if the app grows beyond four tabs
