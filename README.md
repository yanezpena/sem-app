# Expense Tracker

Simple expense management app — NestJS API + Expo mobile with shared TypeScript types.

## Description

### Features Overview

- Expense Entry:

  Photo Capture/Upload: Users can either take a photo of the receipt or upload an existing one.

  Details Input:

```
  Date: The date of the expense.
  Note: Any additional information about the expense.
  Category: Pre-defined categories for easier tracking (e.g., Food, Transport, Entertainment).
```

- Report Generation:

  Simple Report: Users can view expenses filtered by user, date, and category.

## Stack

- **API:** NestJS, Prisma, PostgreSQL, JWT auth
- **Mobile:** Expo (React Native), TanStack Query
- **Shared:** `packages/shared` — types used by both apps

## Features

- **Auth:** Email/password + Google OAuth
- **Expenses:** Add, list, delete expenses with amount, description, category
- **Per-user:** Each user sees only their own expenses

## Prerequisites

- Node.js 18+
- pnpm 9+
- Docker (for PostgreSQL, or use Docker Compose for full stack)

## Setup

### Option A: Run with Docker Compose (API + DB + Web)

Runs PostgreSQL, the API, and the web app in containers:

```bash
cp docker-compose.env.example .env   # optional: edit .env for JWT_SECRET, etc.
docker compose up -d --build
```

Then run migrations once (from your machine; DB is on host port **5433** to avoid conflict with other Postgres):

```bash
DATABASE_URL="postgresql://expense:expense@localhost:5433/expense_tracker?schema=public" pnpm db:deploy
```

- **API:** http://localhost:3000  
- **Web app:** http://localhost:8080  
- **PostgreSQL:** localhost:**5433** (user `expense`, password `expense`, db `expense_tracker`)

To seed categories: `cd apps/api && DATABASE_URL="postgresql://expense:expense@localhost:5433/expense_tracker?schema=public" pnpm exec prisma db seed`

### Option B: Local dev (Node + Docker for DB only)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
cd data && docker-compose up -d && cd ..
```

### 3. Configure API

```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env if needed (default matches docker-compose)
```

### 4. Run migrations

If PostgreSQL is running (from step 2):

```bash
pnpm db:deploy
```

Or for dev, push schema without migration files:

```bash
pnpm db:push
```

## Development

### API (port 3000)

```bash
pnpm api
```

### Mobile

```bash
pnpm mobile
```

For a physical device, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your machine's IP (e.g. `http://192.168.1.100:3000`).

**App icon:** The custom icon (indigo “E” for Expense) is used in **web** (favicon), **splash screen**, and in **native builds** only. **Expo Go does not show your app icon**—it uses its own. To see the real icon, run a dev build (`cd apps/mobile && npx expo run:ios` or `expo run:android`) or build for production. To regenerate icon assets: `cd apps/mobile && pnpm generate-icon`.

## Deployment

See **[docs/deployment-plan.md](docs/deployment-plan.md)** for a full plan to deploy the API (NestJS + Prisma), PostgreSQL, and the Expo app to the cloud (e.g. Railway, Render, EAS).

**Docker / Kubernetes:** The API has a **Dockerfile** and the web app has **Dockerfile.web** at the repo root; **Kubernetes manifests** are in **`k8s/`** (API + web). See **`k8s/README.md`** for build and deploy steps.

## Scripts

| Command           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `pnpm api`        | Start API dev server                                  |
| `pnpm mobile`     | Start Expo dev server                                 |
| `pnpm build`      | Build shared + API                                    |
| `pnpm db:migrate` | Run Prisma migrations                                 |
| `pnpm db:studio`  | Open Prisma Studio                                    |
| `pnpm clean`      | Remove build/cache dirs (dist, .expo, coverage, etc.) |
| `cd apps/mobile && pnpm generate-icon` | Regenerate app icon assets (E logo)   |
| `docker compose up -d --build`         | Run API + DB + web with Docker Compose |

## Project structure

```
├── apps/
│   ├── api/          # NestJS + Prisma
│   └── mobile/       # Expo app
├── packages/
│   └── shared/       # Shared types
├── data/             # Docker Compose for Postgres
└── pnpm-workspace.yaml
```

```mermaid
graph TD
subgraph "Client Layer (Flutter)"
A[Mobile/Web App] --> B{Auth Middleware}
end

    subgraph "Security & Identity (Supabase Auth)"
        B -->|MFA Required| C[JWT / Session Management]
        C -->|Includes association_id| D[API Gateway]
    end

    subgraph "Application Logic (Serverless / Edge)"
        D --> E[Compliance Engine]
        E -->|Check 30-day clock| F[Statutory Ticker]
        D --> G[Privacy Engine]
        G -->|Trigger Redaction| H[Nutrient AI API]
    end

    subgraph "Data Layer (PostgreSQL)"
        F --> I[(Relational DB)]
        I -->|Enforce RLS| J[Tenant Isolation: Association ID]
        J --> K[Official Records Table]
        J --> L[SIRS/Safety Table]
        J --> M[Audit Logs]
    end

    subgraph "Storage Layer (AWS S3)"
        K --> N[Encrypted S3 Buckets]
        N -->|Public| O[Notice Agendas]
        N -->|Private| P[Verified Owner Portal]
        H -.->|Scrubbed PDF| P
    end

    %% Styles
    style J fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#ff9,stroke:#333,stroke-width:2px
    style H fill:#bbf,stroke:#333,stroke-width:2px
```

```mermaid
graph LR
    Start((App Launch)) --> Login[MFA Login]
    Login --> Role{User Role?}

    Role -->|Board/Admin| AdminDash[Compliance Dashboard]
    Role -->|Owner| OwnerDash[Owner Home]

    AdminDash --> Upload[Smart Upload Wizard]
    AdminDash --> Vault[The Statutory Vault]

    OwnerDash --> Search[OCR Global Search]
    OwnerDash --> Safety[Structural Health View]
    OwnerDash --> Vote[Electronic Ballot]

    Vault --> PDF[Secure PDF Viewer]
``
```
