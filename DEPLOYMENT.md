# Rankora Deployment Guide (100% Free or Under ₹500)

This guide walks you through deploying **Rankora** live to the internet with high availability, global CDN, and automated SSL (`https://`), so all your juniors and the entire college can use it.

---

## 💡 Cost Breakdown & Budget Strategy (₹500 Budget)

| Component | Service | Cost |
|---|---|---|
| **App Hosting & APIs** | [Vercel](https://vercel.com) (Hobby Plan) | **₹0 (Free Forever)** |
| **Cloud Database** | [Turso](https://turso.tech) (Serverless SQLite / 9 GB) | **₹0 (Free Forever)** |
| **Contest Cron Jobs** | Vercel Cron / [cron-job.org](https://cron-job.org) | **₹0 (Free)** |
| **SSL / HTTPS** | Automatic via Vercel | **₹0 (Free)** |
| **Domain Name** | Free subdomain (`rankora.vercel.app`) OR Custom `.in` domain | **₹0** (Free subdomain) OR **~₹399-499** (e.g. `rankora.in` on GoDaddy/Namecheap) |
| **Total Cost** | | **₹0 (Zero)** without custom domain / **₹399-499** with custom domain |

You do **not** need a paid VPS or server. Next.js runs fastest on Vercel, and Turso cloud database gives you full SQLite compatibility without disk write restrictions.

---

## Step 1: Set Up Free Cloud Database on Turso (5 minutes)

1. Go to **[https://turso.tech](https://turso.tech)** and sign in with your GitHub account.
2. In the Turso dashboard, click **"Create Database"**.
   - Name: `rankora-db`
   - Location: Choose **India (BOM / Mumbai)** or closest region.
3. Once created, copy two values from the dashboard:
   - **Database URL**: looks like `libsql://rankora-db-yourusername.turso.io`
   - **Auth Token**: Click "Generate Token" and copy the token string.

### Run Schema Migration on Turso
Run the Turso CLI (or use the Turso Dashboard SQL console) to execute the migration SQL:
```bash
# Install Turso CLI (macOS)
brew install tursodatabase/tap/turso

# Login to Turso
turso auth login

# Apply schema directly from migration file
turso db shell rankora-db < prisma/migrations/20261022104648_init/migration.sql
```
*(Optional: If you want to seed initial demo college/data onto Turso, set `DATABASE_URL` and `TURSO_AUTH_TOKEN` in your terminal and run `npm run seed`).*

---

## Step 2: Push Your Project to GitHub (3 minutes)

Make sure all your changes are committed and pushed to GitHub:

```bash
cd /Users/abdullahfaiz/Documents/Rankora

# Check git status
git status

# Add and commit
git add .
git commit -m "feat: ready for production deployment with turso cloud database"

# If not already connected to a GitHub remote:
# git remote add origin https://github.com/<your-username>/rankora.git
# git branch -M main
# git push -u origin main

git push origin main
```

---

## Step 3: Deploy to Vercel (3 minutes)

1. Go to **[https://vercel.com](https://vercel.com)** and sign in with GitHub.
2. Click **"Add New..."** -> **"Project"**.
3. Select your `rankora` repository and click **"Import"**.
4. In **"Environment Variables"**, add the following:
   - `DATABASE_URL`: Your Turso database URL (`libsql://rankora-db-yourusername.turso.io`)
   - `TURSO_AUTH_TOKEN`: Your Turso auth token
   - `CRON_SECRET`: Any random secret string (e.g. `rankora_secure_cron_2026`)
5. Click **"Deploy"**!
6. In about 60–90 seconds, your site will be live at `https://rankora.vercel.app` (or your chosen project name).

---

## Step 4: Custom Domain (Optional - Using your ₹500 budget)

If you want a professional link like `rankora.in` or `campuscode.in`:
1. Buy a domain on **Namecheap**, **GoDaddy**, or **Hostinger** for ~₹399 to ₹499 (1st year).
2. In your Vercel Dashboard, go to **Settings → Domains**.
3. Type your domain (e.g. `rankora.in`) and click **Add**.
4. Vercel will show 2 DNS records (A record `@ -> 76.76.21.21` and CNAME `cname.vercel-dns.com`).
5. Copy these into your domain registrar's DNS settings. Within a few minutes, Vercel will automatically issue a free SSL certificate!

---

## Step 5: Automate Contest Sync (Every 15-30 Mins)

Vercel will automatically run the crons specified in `vercel.json`. Alternatively, to ensure frequent syncing:
1. Go to **[https://cron-job.org](https://cron-job.org)** (100% Free).
2. Create a new cron job:
   - **URL**: `https://your-domain.vercel.app/api/cron/sync-contests`
   - **Method**: `POST`
   - **Header**: `Authorization: Bearer <your-CRON_SECRET>`
   - **Schedule**: Every 30 minutes.

---

## Verification Checklist

- [x] Project passes `npm run check` (TypeScript + ESLint).
- [x] Production build passes `npm run build` (Next.js 16 App Router).
- [x] Prisma LibSQL driver adapter integrated for production cloud database.
- [x] Local development fallback to `better-sqlite3` maintained.
- [x] `.env.example` and `vercel.json` configured.
