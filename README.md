# Iturrieta Sagardotegia — API

Express + TypeScript backend for the Iturrieta booking platform (Hackathon 1 · Reservas Iturrieta).

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

- API base: `http://localhost:4000/api/v1`
- Swagger UI: `http://localhost:4000/api-docs`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run production build |
| `npm run test:run` | Vitest |
| `npm run lint` | ESLint |

## Status

Initial foundation: health check, Swagger, env validation, error handling. Booking and staff modules are planned for the next milestone.
