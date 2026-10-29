# GrowMate (MERN)

## Run
1. Server: `cd server && cp .env.example .env` (edit MONGO_URI, JWT_SECRET) then `npm install`, `npm run seed:admin`, `npm run dev`
2. Client: `cd client && npm install && npm run dev` → http://localhost:5173

Admin login = ADMIN_EMAIL / ADMIN_PASSWORD from `.env`.
New sign-ups are students; admin turns them into mentors (All tab) and assigns via Batch.
