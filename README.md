# Payslip Generator

A simple internal payroll utility with exactly two modules:

1. **Salary Data** — import salary/employee data from Excel once, then view, search, filter and edit it in a table.
2. **Payslip Generator** — pick a month and an employee, the app fetches their salary data automatically, calculates gross earnings, gross deductions and net pay, shows a live preview, and generates a print-ready PDF payslip. **Download all** produces every payslip for the selected month as a single ZIP.

Data flow: `Excel Import → Google Sheet → Select Month/Employee → Auto Calculation → Preview → PDF → Google Drive`.

There is no database. Salary records are stored only in a Google Sheet in your Google Drive, which the backend reads and writes through a Google Apps Script Web App.

## Tech stack

- **Frontend:** React 19, Vite, Material UI, React Router, Axios
- **Backend:** Node.js, Express
- **Data store:** Google Sheets, through a Google Apps Script Web App (`backend/google-apps-script/Code.gs`)
- **Excel import:** SheetJS (`xlsx`, installed from the official SheetJS CDN build — the npm registry release is stale and has known unpatched vulnerabilities)
- **PDF generation:** Puppeteer

## Project layout

```
backend/    Express API, Google Sheet store, payroll calculation service, PDF/Excel services
backend/google-apps-script/Code.gs   the Apps Script that reads/writes the sheet and saves PDFs to Drive
frontend/   React app (Salary Data page + Payslip Generator page)
```

## Prerequisites

- Node.js 22+
- A Google account (for the Sheet and Drive)

## Local setup

### 1. Google Apps Script (the data store)

1. Go to [script.google.com](https://script.google.com/), click **New project**, and replace the editor contents with `backend/google-apps-script/Code.gs`. Save.
2. **Deploy → New deployment →** gear icon **→ Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy and authorize.
3. Copy the Web app URL (ending in `/exec`).

Check it by opening the URL in a private/incognito window: it should show `{"status":"ok",...}`, not a Google sign-in page.

**Protect it with a key (recommended).** Anyone who has the Web app URL could otherwise read the salary sheet. In the Apps Script editor, open **Project Settings → Script Properties**, add `API_KEY` with a long random value, and set `GOOGLE_APPS_SCRIPT_KEY` to the same value in `backend/.env` (and on Vercel).

**After changing `Code.gs`**, redeploy it: **Deploy → Manage deployments →** edit (pencil) **→ Version: New version → Deploy**. The URL stays the same.

### 2. Backend

```
cd backend
npm install
copy .env.example .env      # then set GOOGLE_APPS_SCRIPT_URL to the URL from step 1
npm run dev
```

The API listens on `http://localhost:5000`. On first use, the Apps Script creates the `Payslip Generator - Salary Records` spreadsheet in the Drive folder set by `GOOGLE_DRIVE_MAIN_FOLDER_ID`.

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

## The Google Sheet

The **Salary Records** tab holds one row per employee per month. **Employee ID + Month + Year** identifies a row, so an employee can't have two rows for the same month.

- Row 1 is the header row. The app expects its columns in this order: `Employee ID, Employee Name, Designation, Date of Joining, Bank Name, Bank Account Number, PAN, ESIC No, UAN No, Month, Year, Month Days, Paid Days, Payroll Type, Basic, HRA, Conveyance Allowances, Medical Allowances, Special Allowances, Night Shift Allowances, Other Earnings, PF Employee, ESIC Employee, Other Deductions, Gross Earnings, Gross Deductions, Net Pay, Last Updated`. If they are renamed or reordered, the app stops with an error that says which column is wrong.
- You can edit values directly in the sheet. The app reads them on the next request. Text columns (IDs, bank details, dates, Month, Payroll Type) are stored as plain text, so leading zeros are kept.
- **Gross Earnings**, **Gross Deductions** and **Net Pay** are written by the app for reference. The app always recalculates them from the amounts, so a hand edit to the amounts is picked up even if these columns are stale.
- Don't put formulas in the app's columns: saving a record rewrites their values. Columns you add to the right of **Last Updated** are left alone.
- Employee details (name, designation, bank, PAN, …) are shared by all of an employee's months: saving any row for an employee updates those columns on their other rows too.
- Writes go through a lock in the Apps Script, so two people saving at the same time can't overwrite each other's changes.

## Excel import format

Module 1's **Import Excel** button expects a workbook whose first sheet has a header row with these columns (use **Download Template** in the Import dialog to get a ready-made file with example data):

`Employee ID, Employee Name, Designation, Date of Joining, Bank Name, Bank Account Number, PAN, ESIC No, UAN No, Month, Month Days, Paid Days, Payroll Type, Basic, HRA, Conveyance Allowances, Medical Allowances, Special Allowances, Night Shift Allowances, Other Earnings, Provident Fund (Employee), ESIC (Employee), Other Deductions`

- `Month` accepts formats like `April-2026`, `April 2026` or `04-2026`.
- `Payroll Type` accepts `PF + ESI`, `PF Only` or `No Deduction` (case-insensitive).
- A row is matched by **Employee ID + Month**: a new combination is added to the Google Sheet, an existing one is updated. Employee details (name, designation, bank details, etc.) are refreshed from the row's data every time.
- Rows that fail validation are reported individually and never silently dropped; valid rows in the same file still import. All valid rows are saved to the sheet in one request.

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

**Print** sends the exact HTML the PDF is rendered from to the browser's print dialog, and nothing is saved. A PDF download saves the payslip to Google Drive (see below), which is the record of generated payslips.

## Company details on the payslip

Set these in `backend/.env` (see `.env.example`):

```
COMPANY_NAME=
COMPANY_ADDRESS=
COMPANY_PHONE=
COMPANY_LOGO_URL=   # optional image URL; the bundled Milta logo (backend/src/assets/logo.svg) is used if left blank
```

## Google Drive

- The Drive folder set by `GOOGLE_DRIVE_MAIN_FOLDER_ID` holds the spreadsheet and a `Payslips` subfolder.
- Every generated payslip PDF is saved into a month subfolder (e.g. `Payslips / September 2026 / Payslip_EMP001_September_2026.pdf`).
- Re-generating a payslip replaces the existing file in Drive rather than creating a duplicate.
- The **Google Sheet** button on Salary Data opens the spreadsheet, and the **Google Drive** button in the Payslip Generator opens the stored payslips.

---

## Deployment

### Deploying the Complete Application to Vercel

The repo deploys as one Vercel project with two [services](https://vercel.com/docs/services), defined in the root `vercel.json`:

| Service | Directory | Public path |
|---|---|---|
| `backend` (Express, entry `src/app.js`) | `backend/` | `/api` and `/api/*` |
| `frontend` (Vite SPA) | `frontend/` | everything else; unknown paths fall back to `index.html` |

Both are served from the same domain, so the browser calls the API at the relative path `/api` (the default `VITE_API_BASE_URL`) and needs no CORS setup. The backend receives the full path (`/api/health`, not `/health`), matching its Express routes. Neither service calls the other server-side, so no service bindings are configured.

1. **Push Repository:** Push this repository to GitHub/GitLab/Bitbucket.
2. **Import into Vercel:** keep the root directory at `./`. The services in `vercel.json` set each service's framework and directory.
3. **Environment Variables on Vercel** (project settings; shared by both services):
   - `GOOGLE_APPS_SCRIPT_URL` (required: without it the app can't read or save salary records)
   - `GOOGLE_APPS_SCRIPT_KEY` (if you set an `API_KEY` Script Property)
   - `GOOGLE_DRIVE_MAIN_FOLDER_ID`, `GOOGLE_SHEET_TITLE`
   - `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_PHONE`
   - `NODE_ENV=production`
4. **Deploy:** Click **Deploy**. PDF generation runs using `@sparticuz/chromium` in the serverless environment. Function memory is set in the project dashboard (**Settings → Functions**), not in `vercel.json`.

To run both services locally the way Vercel routes them, use `vercel dev` from the repo root (after `vercel link`).

## A note on access control

This app has no login screen — by design it matches the two-module spec exactly. If it will be reachable on the public internet, put it behind some access control before going live, since it stores PAN numbers, bank account numbers and salary data. Options, roughly in order of effort:
- Restrict the Render/Vercel deployments to your office network or a VPN.
- Add a shared-password gate in front of the frontend (e.g. Vercel's built-in password protection on paid plans).
- Add proper authentication to the API if multiple people need distinct accounts.

The Apps Script Web App URL gives read and write access to the salary sheet. Set an `API_KEY` Script Property (see Local setup) so the URL alone isn't enough, and keep both out of the repo: share them only through environment variables.

Ask if you'd like help wiring any of these up.
