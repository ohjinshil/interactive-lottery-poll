# Interactive Lottery Poll MVP

Mobile-first lottery voting app for Vercel.

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the participant app and `http://localhost:3000/admin` for the admin creator.

## Vercel Deployment

For a free MVP with persistent data, create an Upstash Redis database and set these Vercel environment variables:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
ADMIN_PIN=1234
```

Without Upstash variables, local development uses `data/local-store.json`. Vercel serverless file storage is not persistent, so use Upstash for real deployment.
