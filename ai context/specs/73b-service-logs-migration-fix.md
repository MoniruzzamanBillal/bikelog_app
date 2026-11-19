# 73b: Service-logs table missing in production — migration not applied

Status: ✅ **Fixed 2026-11-19.**

## The error

While inserting real data against the deployed API (spec 73's post-implementation step), every
`POST /bikes/:id/service-logs` and `GET .../status` returned **HTTP 500**:

```
Database error (P2021)
The table `public.service_logs` does not exist in the current database.
  Invalid `prisma.serviceLog.count()` / `prisma.serviceLog.create()` invocation
```

## Root cause

The **code** for `bikelog_server` spec 67 was pushed and deployed (routes respond: anonymous
calls get `401`, authenticated calls reached Prisma), but its **database migration was never
applied**. `deploy.yml` deploys the Vercel function on push to `master`; it does **not** run
migrations — those are manual (`yarn db:migrate`), exactly as spec 73 §J gate 1 and the server
spec 67 note. So the deployed code referenced a `service_logs` table that did not exist.

`npx prisma migrate status` confirmed exactly one pending migration on the production Neon DB
(`neondb`): `20261118061500_add_service_logs` — an additive `CREATE TABLE` + 3 enums
(`ServiceKind`, `ServiceStatus`, `ServiceCenterType`) + 2 indexes, **no backfill**.

## Fix

Apply the one pending migration to production with the documented production command — never
`prisma migrate dev` (it offers to reset the DB; see root CLAUDE.md):

```bash
cd bikelog_server
yarn db:migrate          # = prisma migrate deploy (uses DATABASE_URL_UNPOOLED via prisma.config.ts)
```

`migrate deploy` applies only not-yet-applied migrations, so it touches `add_service_logs`
alone. The change is additive and non-destructive (new table + enums + indexes), so there is no
deploy-order constraint and no data risk.

## Verification

- `npx prisma migrate status` → "Database schema is up to date".
- Re-run the real-data insertion: `POST /service-logs` returns `201`, `GET /status` returns the
  warranty summary. (See spec 73 Test plan V1–V5.)

## Prevention

This is the standing manual-migration gate, not a new class of bug: any future server spec that
adds a migration needs `yarn db:migrate` run by hand after the Vercel deploy. Spec 73 §J gate 1
already states it; this file records the one time the gate was hit for the service module.
