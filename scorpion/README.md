# Scorpion Visitor Management

React, TypeScript, Vite, and Supabase frontend for visitor check-in, courier receipts, approvals, reports, and user management.

## Local setup

Run commands from this directory:

```sh
npm ci
cp .env.example .env
npm run dev
```

Update `.env` with the Supabase project values:

```sh
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these values, the app can render locally but login and data-changing screens cannot talk to Supabase.

## Checks

```sh
npm run lint
npm run build
```

The lint setup keeps existing type-hardening items visible as warnings so new UI or workflow changes are not blocked by pre-existing generated-code debt.
