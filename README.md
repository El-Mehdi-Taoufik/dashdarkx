# DashDarkX

React + TypeScript + Vite dashboard with a Node.js/Express + Prisma + SQLite backend.

## Run the backend

```bash
cd backend
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Backend: `http://localhost:4000`

Health check: `http://localhost:4000/api/health`

Seeded admin:
- Email: `admin@dashdarkx.local`
- Password: `Admin123!`

## Run the frontend

In another terminal:

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173/dashdarkX/`

The frontend automatically uses `http://localhost:4000/api`. To change it, create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:4000/api
```

## Backend features

- JWT authentication
- Signup / Login / Current user
- SQLite database through Prisma
- Users and roles
- Products CRUD
- Orders CRUD
- Dashboard summary
- Revenue, visitors and tasks endpoints
- CORS and request validation with Zod

## Important

Change the JWT secret and the seeded admin password before deploying to production.
