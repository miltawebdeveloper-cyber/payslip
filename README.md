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

## Company details on the payslip

Set these in `backend/.env` (see `.env.example`):

```
COMPANY_NAME=
COMPANY_ADDRESS=
COMPANY_PHONE=
COMPANY_LOGO_URL=   # optional image URL; the bundled Milta logo (backend/src/assets/logo.svg) is used if left blank
```

## Deployment

### Backend → Render

1. Create a **PostgreSQL** instance on Render (or use any managed Postgres) and note its connection details.
2. Create a **Web Service** pointed at the `backend/` directory.
   - Build command: `npm install`
   - Start command: `npm start`
3. Set environment variables from `backend/.env.example` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `CORS_ORIGIN=<your Vercel URL>`, `COMPANY_*`, `NODE_ENV=production`).
4. Puppeteer downloads its own Chromium at `npm install` time; Render's standard Node runtime supports this out of the box.

### Frontend → Vercel

1. Import the `frontend/` directory as the project root.
2. Framework preset: Vite.
3. Set `VITE_API_BASE_URL` to the deployed backend's `/api` URL, e.g. `https://payslip-generator-api.onrender.com/api`.

## A note on access control

This app has no login screen — by design it matches the two-module spec exactly. If it will be reachable on the public internet, put it behind some access control before going live, since it stores PAN numbers, bank account numbers and salary data. Options, roughly in order of effort:
- Restrict the Render/Vercel deployments to your office network or a VPN.
- Add a shared-password gate in front of the frontend (e.g. Vercel's built-in password protection on paid plans).
- Add proper authentication to the API if multiple people need distinct accounts.

Ask if you'd like help wiring any of these up.
