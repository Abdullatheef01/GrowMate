<div align="center">

<img width="100" height="100" alt="favicon" src="https://github.com/user-attachments/assets/64554c07-c9e6-4f43-9c51-09bd3089d3ca" />



# GrowMate

**A student mentoring platform for colleges.**
Counselling records, CIAT and model exam scores, semester results and mentor allocation, in one place.

[Live demo](https://grow-matee.vercel.app) &nbsp;•&nbsp; [Features](#features) &nbsp;•&nbsp; [Tech stack](#tech-stack) &nbsp;•&nbsp; [Getting started](#getting-started) &nbsp;•&nbsp; [Deployment](#deployment)

![React](https://img.shields.io/badge/React-18-6d23f0?style=flat-square&logo=react&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-18%2B-6d23f0?style=flat-square&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-6d23f0?style=flat-square&logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-6d23f0?style=flat-square)

</div>

---

## About

GrowMate connects students with their college mentors. A mentor can record counselling sessions, publish exam and semester tables for the students assigned to them, and follow each student's progress. Students fill in their own scores and profile. An admin manages users, batches and mentor allocation.

The app has three roles, each with its own dashboard:

| Role | What they do |
|---|---|
| **Student** | Fills in profile, confirms counselling, enters CIAT, model exam and semester scores |
| **Mentor** | Records counselling, builds and publishes score tables, views assigned students |
| **Admin** | Manages users, batches, mentors and alumni, resets passwords, controls edit access |

<!-- Add screenshots here, for example:
![Student dashboard](docs/student-dashboard.png)
-->

## Features

### Student
- Register with email OTP verification, log in, reset a forgotten password with OTP
- Dashboard with scrolling tabs: **Counselling**, **CIAT / Model Exam**, **Semester Score**
- Confirm (accept) counselling sessions recorded by the mentor
- Enter exam marks (0 to 100, `AB` for absent, `U` for fail) and semester grades, arrears and CGPA
- Saved entries lock automatically. The student can edit again only when the mentor or admin allows it
- Full profile: personal details, previous academics, admission type, scholarship, profile photo
- Email is locked. Register number can be changed only once
- Aadhar number is never stored in full, only the last 4 digits

### Mentor
- Assigned students list with a read-only detail view (profile, academics, exam scores, semester results)
- **Score Table** and **Semester Table** builder: set the title, rows, subjects and codes, then save as draft or publish
- Edit published tables without losing the students' entries
- Record counselling with the date and time set automatically. Filter by All, Accepted and Pending
- Allow editing for one student, or for every student of a table
- Tables can be created only after students are assigned

### Admin
- Dashboard counts: all users, students, mentors, batches
- User list with search and pagination: make mentor or student, edit details, disable or enable, reset password, delete
- Batches: group students, assign a mentor, remove students. A student belongs to one batch at a time
- Mentor overview with assigned and unassigned counts
- **Alumni** section: students move automatically on 1 July of the admission year plus 4. Past mentors and counselling history stay available
- Deleting a mentor keeps their tables, scores and counselling. Students keep their history, and the mentor is shown as "(removed)"

### Quality of life
- Skeleton loaders while data loads
- Buttons lock while a request is running, which prevents duplicate records
- Animated "saved" confirmation shown only after the database confirms the save
- Responsive layout for phone, tablet and desktop

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Axios |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose (MongoDB Atlas in production) |
| Auth | JWT, bcrypt, email OTP |
| Email | Nodemailer (Gmail SMTP for local testing), Brevo API (production) |
| Images | Multer and Cloudinary |
| Security | Helmet, express-rate-limit, role-based access control |
| Hosting | Vercel (client), Render (server), MongoDB Atlas (database) |

Design: primary colour `#6d23f0`, headings in Poppins, body text in Roboto.

## Project structure

```
growmate/
├── client/                     React app (Vite)
│   ├── public/                 favicon and static files
│   └── src/
│       ├── components/         shared UI: modal, header, skeletons, tables
│       ├── context/            auth state
│       ├── hooks/              usePaged, useAction
│       ├── pages/              Login, Register, Student, Mentor, Admin dashboards
│       └── utils/
└── server/                     Express API
    ├── config/                 database connection
    ├── middleware/             auth and role checks
    ├── models/                 User, Batch, ExamTable, SemesterTable, Counselling
    ├── routes/                 auth, student, mentor, admin, upload
    ├── scripts/                seedAdmin and one-off maintenance scripts
    └── utils/                  mailer, OTP, password rules, helpers
```

## Getting started

### Prerequisites
- Node.js 18 or newer
- A MongoDB database (local, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- A [Cloudinary](https://cloudinary.com) account for profile photos
- A Gmail account with an App Password (local email testing), or a [Brevo](https://www.brevo.com) API key

### 1. Clone and install
```bash
git clone https://github.com/Abdullatheef01/GrowMate.git
cd GrowMate

cd server && npm install
cd ../client && npm install
```

### 2. Configure the server
```bash
cd server
cp .env.example .env
```
Fill in `server/.env` (see [Environment variables](#environment-variables)).

### 3. Create the admin account
```bash
cd server
npm run seed:admin
```
The admin email and password come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

### 4. Run the app
Open two terminals:

```bash
# Terminal 1: API on http://localhost:5000
cd server
npm run dev
```
```bash
# Terminal 2: client on http://localhost:5173
cd client
npm run dev
```

Open http://localhost:5173. In development the client proxies `/api` to the server, so no client configuration is needed.

> Without any mail settings, the OTP is printed in the server terminal during local development.

## Environment variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API port. Defaults to `5000` |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Random secret, at least 32 characters |
| `CLIENT_URL` | Yes | Allowed frontend origin, for example `https://your-app.vercel.app`. Separate several origins with commas. No trailing slash |
| `ADMIN_EMAIL` | Seed | Email for the admin account |
| `ADMIN_PASSWORD` | Seed | Password for the admin account |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `BREVO_API_KEY` | Production | Brevo API key (starts with `xkeysib-`). Used when set |
| `BREVO_SENDER_EMAIL` | Production | Sender address verified in Brevo |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` | Local | Gmail SMTP settings, used when `BREVO_API_KEY` is not set |

Generate a strong `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Client (production only)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full API URL, for example `https://your-api.onrender.com/api` |

## Scripts

| Location | Command | Description |
|---|---|---|
| `server` | `npm run dev` | Start the API with auto-reload |
| `server` | `npm start` | Start the API |
| `server` | `npm run seed:admin` | Create the admin account |
| `client` | `npm run dev` | Start the Vite dev server |
| `client` | `npm run build` | Create a production build in `dist` |

## API overview

All routes are under `/api` and, except for authentication, require a `Bearer` token. Every route checks the user's role on the server.

| Group | Base path | Access |
|---|---|---|
| Authentication | `/auth` | Public: register, login, OTP, password reset |
| Student | `/student` | Student |
| Mentor | `/mentor` | Mentor |
| Admin | `/admin` | Admin |
| Upload | `/upload` | Logged in: profile photo |

## Security

- Passwords hashed with bcrypt. Strong password rules are enforced on the server (8 or more characters, upper and lower case, number, symbol, no common passwords, no name or email)
- Email verification and password reset use 6-digit OTPs that are stored hashed, expire in 10 minutes, allow 5 attempts and have a 60-second resend gap
- Rate limits on login, sign-up and OTP routes. Login and OTP limits are counted per email, so a shared college network is not blocked
- Role-based access control on every route. A mentor can access only their assigned students
- Helmet security headers and a CORS allow-list
- Profile fields are whitelisted on save, so a user cannot change their own role
- Disabled and deleted accounts are blocked on every request, not only at login
- Internal error details are never sent to the browser

## Deployment

| Part | Service | Notes |
|---|---|---|
| Database | MongoDB Atlas | Create a database user and allow network access |
| API | Render | Root directory `server`, build `npm install`, start `npm start`. Add the server environment variables |
| Client | Vercel | Root directory `client`. Set `VITE_API_URL`. `vercel.json` rewrites all routes to `index.html` |

After the first deploy:
1. Set `CLIENT_URL` on Render to the Vercel URL.
2. Run `npm run seed:admin` once against the production database.
3. Send a test OTP email and upload a test photo.

> **Free hosting notes**
> - Render's free plan puts the API to sleep after inactivity. The first request can take around a minute.
> - Render's free plan blocks outbound SMTP ports, so production email uses the Brevo HTTP API.
> - Render's free plan does not keep files on disk, so profile photos are stored on Cloudinary.

## Roadmap

- [ ] Counselling edit and delete for mentors
- [ ] Email notifications for new counselling and published tables
- [ ] httpOnly cookie sessions
- [ ] Export student reports as PDF or Excel
- [ ] Automated tests

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you would like to change.

## License

Released under the [MIT License](LICENSE).

## Author

**Abdul Latheef**
GitHub: [@Abdullatheef01](https://github.com/Abdullatheef01)
