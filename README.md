# Advaitam

A full-stack app with **Express.js** (API), **React** (frontend), and **MongoDB** (database).

## Features

- Admin login (seeded on first startup)
- **Invite users by email** (Gmail) with a temporary password
- Manual user creation with copy-to-share credentials
- Force password change on first login after email invite
- JWT-based authentication with persistent sessions

Planned later: Google SSO and more.

## Quick start

From the project root:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env — JWT_SECRET, admin credentials, Gmail (see below)
npm install
npm run dev
```

This starts both the API (`http://localhost:3030`) and the frontend (`http://localhost:5173`) in one terminal.

> **macOS note:** Port 5000 is often used by AirPlay Receiver and returns 403. The default API port is **3030**. Keep `PORT` in `server/.env` in sync with `VITE_API_PROXY` in `client/.env`.

On first start the server creates the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env`.

**Run separately if you prefer:**

```bash
npm run dev:server   # API only
npm run dev:client   # frontend only
```

Sign in as admin, then go to **User management** → **Invite by email**.

## Gmail setup (for email invites)

Gmail does not allow your normal password for apps. You need a **Google App Password**:

1. Sign in to [Google Account](https://myaccount.google.com/)
2. Enable **2-Step Verification** (required for app passwords)
3. Go to **Security** → **2-Step Verification** → **App passwords**
4. Create an app password (choose "Mail" / "Other" → name it "Advaitam")
5. Copy the 16-character password into `server/.env`:

```env
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM=Advaitam <you@gmail.com>
APP_URL=http://localhost:5173
```

Remove spaces from the app password when pasting. Restart the server after updating `.env`.

## Invite flow

1. Admin enters email in **User management**
2. Server creates the user with a random temporary password
3. Gmail sends the invite with login URL, email, and temp password
4. User signs in → redirected to **Set new password**
5. After updating, user lands on their dashboard

## Project structure

```
advaitam/
├── server/          Express API
│   └── src/
│       ├── routes/  auth + user management
│       ├── models/  User (MongoDB)
│       └── seed/    admin bootstrap
└── client/          React + Vite
    └── src/
        ├── pages/   Login, ChangePassword, admin pages
        └── context/ Auth state
```

## API

| Method | Endpoint                    | Auth  | Description              |
|--------|-----------------------------|-------|--------------------------|
| POST   | `/api/auth/login`           | —     | Login                    |
| GET    | `/api/auth/me`              | User  | Current user             |
| POST   | `/api/auth/change-password` | User  | Set new password         |
| GET    | `/api/users`                | Admin | List users               |
| POST   | `/api/users`                | Admin | Create user manually     |
| POST   | `/api/users/invite`         | Admin | Invite user by email     |
| POST   | `/api/users/test-email`     | Admin | Send test email (verify Gmail) |
| POST   | `/api/users/:id/resend-invite` | Admin | Resend invite email   |
| DELETE | `/api/users/:id`            | Admin | Delete user              |

## Environment variables

**server/.env**

| Variable              | Description                          |
|-----------------------|--------------------------------------|
| `PORT`                | API port (default 3030)              |
| `MONGODB_URI`         | MongoDB connection string            |
| `JWT_SECRET`          | Secret for signing tokens            |
| `JWT_EXPIRES_IN`      | Token lifetime (e.g. `30d`)          |
| `ADMIN_EMAIL`         | Initial admin email (used to sign in) |
| `ADMIN_PASSWORD`      | Initial admin password               |
| `CLIENT_URL`          | Frontend origin for CORS             |
| `APP_URL`             | Login link in invite emails          |
| `GMAIL_USER`          | Gmail address for sending invites    |
| `GMAIL_APP_PASSWORD`  | Google App Password (16 chars)       |
| `MAIL_FROM`           | From header (e.g. `Advaitam <you@gmail.com>`) |
| `INVITE_EXPIRES_DAYS` | Days until invite temp password expires (default 7) |
