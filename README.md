# Iturrieta Sagardotegia — API

Express + TypeScript + MongoDB backend for bookings, authentication, and staff operations.

## Quick start

```bash
npm install
cp .env.example .env
# Edit .env — set JWT secrets (32+ chars), MongoDB URI, optional SMTP or EMAIL_MOCK=true
npm run dev
```

- API base: `http://localhost:5000/api/v1`
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`

## Frontend pairing

In `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Ensure `CLIENT_URL` in server `.env` matches the Vite dev origin (`http://localhost:5173`).

## Authentication

- HttpOnly cookies: `iturrieta_access`, `iturrieta_refresh`
- Customer signup → email OTP → verify → session
- Staff login: `POST /api/v1/auth/staff/login` (staff/admin roles only)
- Bootstrap staff (optional): set `STAFF_BOOTSTRAP_EMAIL` + `STAFF_BOOTSTRAP_PASSWORD` in `.env` on first seed

## Email / OTP

Set SMTP variables or use `EMAIL_MOCK=true` for local development (no real email sent).  
Never commit `.env` or log OTP values.

## Booking

- Public: areas, availability, create reservation, lookup/cancel with reference + email
- Staff: list/filter reservations, update status, stats, read operations config
- Sample venue tables/areas seeded on startup (replace via future admin API)

## Realtime (Socket.IO)

Staff connections authenticate with `auth.token` (access JWT) in the handshake.  
Events: `booking:created`, `booking:updated`, `booking:cancelled` (staff room).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port from `PORT`, default 5000) |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run production build |
| `npm run test:run` | Vitest (in-memory MongoDB) |
| `npm run typecheck` | TypeScript |

## Tests

Automated tests use `mongodb-memory-server` and `EMAIL_MOCK=true`. No real SMTP in CI/local test runs by default.
