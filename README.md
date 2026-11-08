# ADMS Ops Console

A working mini Advanced Distribution Management System (ADMS), built to mirror the core
applications an **Associate DMS Application Engineer** configures, tests, and supports at
a utility:

- **Distribution Power Flow (DPF)** — simplified radial power flow (LinDistFlow /
  Baran-Wu linearized branch model), flags bus voltage violations outside 0.95–1.05 pu.
- **FLISR** — Fault Location, Isolation & Service Restoration: trips the nearest upstream
  breaker, isolates the faulted segment, recloses to restore the unfaulted section, and
  closes a normally-open tie switch to restore an orphaned downstream section from an
  alternate source.
- **VVC/VVO** — Volt/VAR Control & Optimization: greedily switches capacitor banks to
  resolve undervoltage, validating each action against a fresh power flow, then relieves
  any resulting overvoltage.
- **GIS import** — paste a GeoJSON-style extract (points = buses, line strings = line
  segments with a switch) to simulate the "extract, translate, and load" step of getting
  a utility's network model into the DMS.
- **Test event log** — a lightweight record of test runs against each application,
  similar to what's kept during site/factory acceptance testing with a customer.

The network model (buses, line segments, switches, capacitor banks) is persisted in
**MongoDB**.

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- MongoDB (via the official `mongodb` driver)

## Getting started

1. Provision a database and set the connection string:
   - **Via Vercel Marketplace** (recommended): `vercel link`, then
     `vercel integration add mongodb-atlas`, then `vercel env pull .env.local --yes`.
   - **Manually**: copy `.env.local.example` to `.env.local` and set `MONGODB_URI`
     (and optionally `MONGODB_DB`, default `adms`).
2. Install dependencies: `npm install`
3. (Optional) Seed the sample feeder without starting the server: `npm run seed`
4. Run the dev server: `npm run dev`, then open http://localhost:3000

The `/api/network` route auto-seeds the sample feeder the first time it's read, so step 3
is optional — it's there mainly for quick CLI/scripting access to the database, matching
the "programming and scripting experience" side of the role.

## Project structure

- `lib/types.ts` — network model types (nodes, edges/switches, capacitor banks, results)
- `lib/network-data.ts` — the sample feeder (two sources, radial trunk + laterals, one tie)
- `lib/powerflow.ts` — the DPF engine
- `lib/flisr.ts` — the FLISR engine
- `lib/vvo.ts` — the VVC/VVO engine
- `lib/gis-import.ts` — GeoJSON → network model translator
- `app/api/*` — REST endpoints backing each page
- `app/*` — dashboard, network/GIS, DPF, FLISR, VVO, and test-log pages
- `scripts/seed.mjs` — standalone CLI seeder (no Next.js server required)
