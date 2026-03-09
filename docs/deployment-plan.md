# Deployment Plan: Expense Tracker to the Cloud

This document outlines how to deploy the Expense Tracker API, database, and mobile app to the cloud.

---

## 1. What You’re Deploying

| Component | Tech | Notes |
|-----------|------|--------|
| **API** | NestJS, Prisma | REST + JWT + OAuth, serves `/expenses`, `/categories`, `/auth`, `/uploads` |
| **Database** | PostgreSQL | Persists users, expenses, categories |
| **File storage** | Local disk (`uploads/`) | Receipt images; **must move to cloud storage** for production |
| **Mobile** | Expo (React Native) | iOS/Android apps + web build; points to API via `EXPO_PUBLIC_API_URL` |

---

## 2. Recommended Architecture (Simple Path)

- **API + DB**: One platform that runs Node and provides Postgres (e.g. **Railway**, **Render**, **Fly.io**).
- **Receipt storage**: Object storage with a public (or signed) URL (e.g. **Cloudflare R2**, **AWS S3**, **Railway Volumes** or **Render Disk** for a minimal first step).
- **Mobile**: **Expo EAS** for building and (optionally) submitting to App Store / Play Store; optional **web** deploy (Vercel/Netlify) for the Expo web build.

```mermaid
flowchart TB
  subgraph Client["Client"]
    Mobile["Mobile (EAS)<br/>iOS / Android / Web"]
  end

  subgraph Cloud["Cloud"]
    API["API (Railway / Render)<br/>NestJS + Prisma"]
    DB[(PostgreSQL<br/>managed by platform)]
    Storage["Object storage<br/>S3 / R2 / volume"]
  end

  Mobile <-->|EXPO_PUBLIC_API_URL| API
  API -->|DATABASE_URL| DB
  API -->|receipt uploads| Storage
```

---

## 3. Platform Options (Quick Comparison)

| Platform | API (Node) | Postgres | File storage | Free tier | Good for |
|----------|------------|----------|--------------|-----------|----------|
| **Railway** | ✅ | ✅ Add-on | Volumes or R2/S3 | Limited | Easiest all-in-one |
| **Render** | ✅ | ✅ Add-on | Disk (ephemeral warning) | Yes | Simple, free tier |
| **Fly.io** | ✅ | ✅ (or external) | Volumes | Yes | Global, more control |
| **Vercel** | ✅ Serverless | Vercel Postgres / Neon | Blob / S3 | Yes | API + web frontend |
| **AWS / GCP** | ECS, App Engine, etc. | RDS / Cloud SQL | S3 / GCS | Pay-as-you-go | Full control |

**Recommendation for a first deploy:** **Railway** or **Render** for API + Postgres; add **Cloudflare R2** (or S3) for receipts when you’re ready to move off local disk.

---

## 4. Pre-Deployment Checklist

### 4.1 API environment variables (production)

Set these in your cloud provider’s dashboard (or `.env` for local prod-like runs):

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port (often set by platform) | `3000` |
| `DATABASE_URL` | Postgres connection string (SSL) | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | Strong secret for JWT signing | Long random string (e.g. 32+ chars) |
| `BASE_URL` | Public URL of the API (for OAuth redirects) | `https://your-api.railway.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | From Google Cloud Console |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Optional; only if using Facebook login | — |

Generate a secure `JWT_SECRET` (e.g. `openssl rand -base64 32`).

### 4.2 Mobile / client configuration

| Variable / config | Where | Description |
|-------------------|--------|-------------|
| `EXPO_PUBLIC_API_URL` | EAS secrets or build env | Production API URL (e.g. `https://your-api.railway.app`) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Same | Web OAuth client ID if using Google sign-in on web |
| OAuth redirect URIs | Google / Facebook consoles | Add production redirect URLs (e.g. `https://your-api.railway.app/auth/google/callback`) |

### 4.3 Database

- Use **migrations** in production (no `db push`).
- Before first deploy, from your machine (with production `DATABASE_URL` set):

  ```bash
  pnpm db:deploy
  ```

- Optionally run seed (categories):

  ```bash
  cd apps/api && pnpm exec prisma db seed
  ```

---

## 5. Deployment Steps (Order of Operations)

### Phase A: Database + API

1. **Create a project** on Railway (or Render / Fly.io).
2. **Add PostgreSQL** (platform-managed); copy `DATABASE_URL`.
3. **Configure API**:
   - Connect repo or upload build; set root/build command so the **API** app is built and run (e.g. build: `pnpm install && pnpm --filter shared build && pnpm --filter api build`, start: `pnpm --filter api start:prod` from repo root, or equivalent from `apps/api`).
   - Set all API env vars (including `DATABASE_URL`, `JWT_SECRET`, `BASE_URL`, OAuth).
4. **Run migrations** against production DB (see 4.3).
5. **Deploy API**; verify health (e.g. `GET https://your-api-url/` or a simple health route if you add one).
6. **Receipt uploads (short term):**  
   Many platforms give the API a writable filesystem; you can keep using local `uploads/` and the existing `/uploads/*` static serving. **Limitation:** uploads are lost on redeploy or scale-to-zero. For persistence, add object storage (Phase C).

### Phase B: Mobile app (Expo EAS)

1. **Install EAS CLI**: `npm i -g eas-cli` (or use `npx eas`).
2. **Login**: `eas login`.
3. **Configure project**: In `apps/mobile`, run `eas build:configure` (creates `eas.json`).
4. **Secrets**: Set `EXPO_PUBLIC_API_URL` (and any other `EXPO_PUBLIC_*`) in EAS:
   ```bash
   cd apps/mobile && eas secret:create --name EXPO_PUBLIC_API_URL --value "https://your-api.railway.app"
   ```
5. **Build**:
   - iOS: `eas build --platform ios --profile production` (or `preview`).
   - Android: `eas build --platform android --profile production`.
6. **Submit** (optional): `eas submit` to send builds to App Store / Play Store.
7. **Web** (optional): Export and host the web build (e.g. `npx expo export -p web`) and deploy the output to Vercel/Netlify; set `EXPO_PUBLIC_API_URL` in the build env there too.

### Phase C: Persistent receipt storage (recommended for production)

1. **Create a bucket** on Cloudflare R2 (or S3 / compatible storage).
2. **API changes** (high level):
   - Add env: `STORAGE_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_ENDPOINT` (or equivalent for your provider).
   - Replace local `diskStorage` in the upload endpoint with an S3/R2 client (e.g. `@aws-sdk/client-s3` with R2 endpoint).
   - Save receipt URL (public or signed) to `expense.receiptUrl` as you do today.
3. **Mobile**: No change if the API still returns a full URL in `receiptUrl`; ensure `resolveReceiptUrl` in the app uses `BASE_URL` or the API origin for relative URLs.

---

## 6. Monorepo Build Notes

- **Shared package**: The API and mobile app depend on `shared`. Your API build must run `shared` build first (e.g. `pnpm --filter shared build` then `pnpm --filter api build` from root, or install + build in `apps/api` with workspace resolution).
- **API start**: Production start command should run the built Node app (e.g. `node dist/main.js` from `apps/api` or `pnpm --filter api start:prod` from root). Ensure `NODE_ENV=production` if you use it.

---

## 7. Optional: Health Check and CORS

- Add a simple **health route** (e.g. `GET /health` or `GET /` returning `{ status: 'ok' }`) so the platform can run health checks.
- **CORS**: The API already calls `app.enableCors()`. For production you can restrict origin to your Expo web URL and EAS app origins if needed.

---

## 8. GitHub Actions (CI)

The repo includes a **CI workflow** (`.github/workflows/ci.yml`) that runs on every push and pull request to `main` (or `master`):

- Install dependencies (`pnpm install --frozen-lockfile`)
- Build shared package + API (`pnpm build`)
- Lint API (`pnpm --filter api lint`)
- Test API (`pnpm --filter api test`)

No database or secrets are required for CI. After you push to GitHub, enable Actions in the repo settings if needed; the workflow will run automatically.

### Optional: Deploy via Actions

- **EAS**: Use `eas build --auto-submit` and EAS Update for OTA updates (from your machine or a dedicated workflow with EAS tokens in secrets).
- **API**: Connect the GitHub repo to Railway/Render/Fly in the platform dashboard for automatic deploy on push to `main`; run `pnpm db:deploy` in a release step or manually when schema changes.

---

## 9. Summary: Minimal Path to “Live”

1. Create **Railway** (or Render) project → add **Postgres** → add **API** service (Node, build + start as above).
2. Set **env vars** (including `DATABASE_URL`, `JWT_SECRET`, `BASE_URL`, Google OAuth).
3. Run **migrations** and **seed** against production DB.
4. Deploy API; note the public URL.
5. In **EAS**, set `EXPO_PUBLIC_API_URL` to that URL; build iOS/Android (and optionally web).
6. Plan **Phase C** (R2/S3) when you need persistent receipt storage across deploys.

After this, the app will be deployable to the cloud with a clear path to add persistent file storage and CI/CD.
