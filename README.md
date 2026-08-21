# BlueHope

BlueHope is a Next.js marketplace/discovery platform for parents, families, sole providers, and institutes.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Firebase Setup

Client-side Firebase web config belongs in `.env.local` with the `NEXT_PUBLIC_FIREBASE_*` keys from `.env.example`.

Server-side Firestore, Storage, and ID-token verification require Firebase Admin service-account values:

```bash
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_STORAGE_BUCKET=
```

Never commit `.env.local`, service-account JSON, private keys, or production secrets.

## Data Architecture

The Firebase-native database foundation lives in:

- `docs/bluehope-data-architecture.md`
- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
- `src/models/firestore.ts`
- `src/models/validation.ts`
- `src/server/firebase/admin.ts`
- `src/server/firestore/repositories.ts`

Seed development/staging data after Firebase Admin env is configured:

```bash
npm run seed:firestore
```

The seed script creates controlled taxonomy records and 50 clearly marked demo Delhi listings.
