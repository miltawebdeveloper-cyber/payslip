# Payslip Generator

A simple internal payroll utility with exactly two modules:

1. **Salary Data** — import salary/employee data from Excel once, then view, search, filter and edit it in a table.
2. **Payslip Generator** — pick a month and an employee, the app fetches their salary data automatically, calculates gross earnings, gross deductions and net pay, shows a live preview, and generates a print-ready PDF payslip. **Download all** produces every payslip for the selected month as a single ZIP.

Data flow: `Excel Import → PostgreSQL → Select Month/Employee → Auto Calculation → Preview → PDF`.

## Tech stack

- **Frontend:** React 19, Vite, Material UI, React Router, Axios
- **Backend:** Node.js, Express, Sequelize
- **Database:** PostgreSQL
- **Excel import:** SheetJS (`xlsx`, installed from the official SheetJS CDN build — the npm registry release is stale and has known unpatched vulnerabilities)
- **PDF generation:** Puppeteer

## Project layout

```
backend/    Express API, Sequelize models, payroll calculation service, PDF/Excel services
frontend/   React app (Salary Data page + Payslip Generator page)
```

## Prerequisites

- Node.js 22+
- A PostgreSQL server (tested against PostgreSQL 18)

## Local setup

### 1. Database

Create an empty database, e.g.:

```
createdb -U postgres payslip_generator
```

### 2. Backend

```
cd backend
npm install
copy .env.example .env      # then edit DB_HOST/DB_USER/DB_PASSWORD etc.
npm run dev
```

The server syncs the schema automatically on startup (no migrations to run) and listens on `http://localhost:5000`.

### 3. Frontend

```
cd frontend
npm install
copy .env.example .env      # VITE_API_BASE_URL=/api is correct for local dev
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to the backend on port 5000.

### Run both at once

From the repository root:

```
npm run install:all
npm run dev
```

## Excel import format

Module 1's **Import Excel** button expects a workbook whose first sheet has a header row with these columns (use **Download Template** in the Import dialog to get a ready-made file with example data):

`Employee ID, Employee Name, Designation, Date of Joining, Bank Name, Bank Account Number, PAN, ESIC No, UAN No, Month, Month Days, Paid Days, Payroll Type, Basic, HRA, Conveyance Allowances, Medical Allowances, Special Allowances, Night Shift Allowances, Other Earnings, Provident Fund (Employee), ESIC (Employee), Other Deductions`

- `Month` accepts formats like `April-2026`, `April 2026` or `04-2026`.
- `Payroll Type` accepts `PF + ESI`, `PF Only` or `No Deduction` (case-insensitive).
- A row is matched by **Employee ID + Month**: a new combination is inserted, an existing one is updated. Employee master fields (name, designation, bank details, etc.) are refreshed from the row's data every time.
- Rows that fail validation are reported individually and never silently dropped; valid rows in the same file still import.

## Payroll calculation

All math lives in one place: `backend/src/services/payrollCalculationService.js`.

- **Gross Earnings** = Basic + HRA + Conveyance + Medical + Special + Night Shift Allowances + Other Earnings
- **Gross Deductions** depends on the row's Payroll Type:
  - `PF + ESI` → Provident Fund + ESIC + Other Deductions
  - `PF Only` → Provident Fund + Other Deductions
  - `No Deduction` → 0
- **Net Pay** = Gross Earnings − Gross Deductions

The same function is used for the live preview and for PDF generation, so they can never disagree.

## What appears on a payslip

Each payslip is built only from the selected employee's own records, and shows only the fields that record has data for. The rules live in one place, `backend/src/services/payslipLayoutService.js`, and the live preview, the PDF download (single and ZIP) and **Print** all render its output, so a field shows in all of them or in none.

- **Employee details and attendance** (Designation, Date of Joining, Bank, PAN, ESIC No, UAN No, Month/Paid Days, …) appear only when filled in. Blank cells and placeholders such as `-`, `NA` or `N/A` count as not provided, and a day count of 0 is treated as blank (as the Excel import already does).
- **Earnings and deductions** appear only when the amount is non-zero. Deductions also follow the Payroll Type: ESIC is shown only for `PF + ESI`, and `No Deduction` payslips have no deductions column at all.
- Hidden fields leave no empty row, `-` or blank cell behind: the details grid, the columns and the totals adjust on their own. The visible lines always add up to Gross Earnings / Gross Deductions.

**Print** sends the exact HTML the PDF is rendered from to the browser's print dialog, and nothing is saved. The PDF download still records each payslip in the `payslips` table, as before.

## Company details on the payslip

Set these in `backend/.env` (see `.env.example`):

```
COMPANY_NAME=
COMPANY_ADDRESS=
COMPANY_PHONE=
COMPANY_LOGO_URL=   # optional image URL; the bundled Milta logo (backend/src/assets/logo.svg) is used if left blank
```

## Google Sheets & Drive Integration

The application integrates with your personal Google account:

1. **Google Sheets Integration:**
   - Automatically maintains all employee salary records in a dedicated Google Spreadsheet (`Payslip Generator - Salary Records`) created directly under your personal account.
   - Syncs automatically when:
     - New salary records are imported from Excel.
     - Single records are added or updated in the table.
     - Records are deleted or bulk-deleted.
   - Includes a **Google Sheet** button to view the live sheet directly in your browser, and a **Sync Sheet** button for instant manual sync.

2. **Google Drive Storage:**
   - Automatically creates a main folder named `Payslip Generator` in your personal Google Drive.
   - Contains a dedicated `Payslips` subfolder.
   - Saves every generated employee payslip PDF into month-specific subfolders (e.g. `Payslips / September 2026 / Payslip_EMP001_September_2026.pdf`).
   - Re-generating a payslip updates the existing file in Drive rather than creating duplicates.
   - A **Google Drive** button in the Payslip Generator allows direct one-click navigation to your stored payslips.

### Setting Up Your Personal Google Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. `Payslip Generator`).
2. Navigate to **APIs & Services > Library** and enable:
   - **Google Sheets API**
   - **Google Drive API**
3. Navigate to **APIs & Services > OAuth consent screen**:
   - Choose **External** (or Internal for Workspace).
   - Enter your email address.
   - Under Scopes, add `.../auth/spreadsheets` and `.../auth/drive`.
   - Under Test Users, add your personal Google account email.
4. Navigate to **APIs & Services > Credentials**:
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URIs: add `http://localhost:5000/api/google/oauth2callback` (and your Vercel URL `https://<your-project>.vercel.app/api/google/oauth2callback`).
   - Copy your **Client ID** and **Client Secret**.
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`.
6. Run the built-in helper script to generate your refresh token:
   ```bash
   npm run google:auth
   ```
   Open the printed link, sign in with your personal Google account, and copy the `GOOGLE_REFRESH_TOKEN` into `backend/.env` (and your Vercel environment variables).

---

## Deployment

### Deploying the Complete Application to Vercel

The repo deploys as one Vercel project with two [services](https://vercel.com/docs/services), defined in the root `vercel.json`:

| Service | Directory | Public path |
|---|---|---|
| `backend` (Express, entry `src/app.js`) | `backend/` | `/api` and `/api/*` |
| `frontend` (Vite SPA) | `frontend/` | everything else; unknown paths fall back to `index.html` |

Both are served from the same domain, so the browser calls the API at the relative path `/api` (the default `VITE_API_BASE_URL`) and needs no CORS setup. The backend receives the full path (`/api/health`, not `/health`), matching its Express routes. Neither service calls the other server-side, so no service bindings are configured.

1. **Database:** Create a managed PostgreSQL database (such as Neon, Supabase, or AWS RDS). Copy the connection string (`DATABASE_URL`).
2. **Push Repository:** Push this repository to GitHub/GitLab/Bitbucket.
3. **Import into Vercel:** keep the root directory at `./`. The services in `vercel.json` set each service's framework and directory.
4. **Environment Variables on Vercel** (project settings; shared by both services):
   - `DATABASE_URL` (or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`)
   - `NODE_ENV=production`
   - Google, either `GOOGLE_APPS_SCRIPT_URL` (plus optional `GOOGLE_DRIVE_MAIN_FOLDER_ID`, `GOOGLE_SHEET_TITLE`) or `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and `GOOGLE_REDIRECT_URI=https://<your-vercel-domain>/api/google/oauth2callback`
   - `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_PHONE`
5. **Deploy:** Click **Deploy**. PDF generation runs using `@sparticuz/chromium` in the serverless environment. Function memory is set in the project dashboard (**Settings → Functions**), not in `vercel.json`.

To run both services locally the way Vercel routes them, use `vercel dev` from the repo root (after `vercel link`).

## A note on access control

This app has no login screen — by design it matches the two-module spec exactly. If it will be reachable on the public internet, put it behind some access control before going live, since it stores PAN numbers, bank account numbers and salary data. Options, roughly in order of effort:
- Restrict the Render/Vercel deployments to your office network or a VPN.
- Add a shared-password gate in front of the frontend (e.g. Vercel's built-in password protection on paid plans).
- Add proper authentication to the API if multiple people need distinct accounts.

Ask if you'd like help wiring any of these up.
