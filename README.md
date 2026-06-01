# Advaitam

A full-stack app with **Express.js** (API), **React** (frontend), and **MongoDB** (database).

## Features

- Admin login (seeded on first startup)
- **Invite users by email** (Gmail) with a temporary password
- Manual user creation with copy-to-share credentials
- Force password change on first login after email invite
- JWT-based authentication with persistent sessions

Planned later: Google SSO and more.

## New machine setup

Use this section when setting up Advaitam on a fresh laptop or VM.

### What you need

| Tool | Version | Purpose |
|------|---------|---------|
| **Git** | any recent | Clone the repository |
| **Node.js** | 18 or newer (20 LTS recommended) | Runs the API and frontend tooling |
| **npm** | comes with Node | Installs project dependencies |
| **MongoDB** | 6 or 7 | Database (local install or MongoDB Atlas cloud) |

Verify after installing:

```bash
git --version
node --version    # should print v18.x or higher
npm --version
mongosh --version # if MongoDB is installed locally
```

---

### macOS (MacBook)

**1. Install Homebrew** (if you don't have it)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**2. Install Git, Node.js, and MongoDB**

```bash
brew install git node mongodb-community@7.0
```

**3. Start MongoDB and enable it on login**

```bash
brew services start mongodb-community@7.0
```

MongoDB will listen on `mongodb://localhost:27017`.

**Alternative — Node via official installer:** download the LTS installer from [nodejs.org](https://nodejs.org/) if you prefer not to use Homebrew.

**Alternative — MongoDB Atlas (no local DB):** create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), get a connection string, and set `MONGODB_URI` in `server/.env` (see [Environment variables](#environment-variables)).

---

### Linux (Ubuntu / Debian)

**1. Install Git and build tools**

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg
```

**2. Install Node.js 20 LTS**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**3. Install MongoDB 7**

Follow [MongoDB's Ubuntu install guide](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/), or use:

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Fedora / RHEL:** use [NodeSource](https://github.com/nodesource/distributions) for Node and [MongoDB docs](https://www.mongodb.com/docs/manual/administration/install-on-linux/) for your distro.

---

### Windows

**1. Install Git**

Download and run the installer from [git-scm.com](https://git-scm.com/download/win). Use default options; ensure **"Git from the command line"** is enabled.

**2. Install Node.js**

Download the **LTS** `.msi` from [nodejs.org](https://nodejs.org/) and run it. This installs both `node` and `npm`. Restart PowerShell or Command Prompt after install.

**3. Install MongoDB**

Download [MongoDB Community Server](https://www.mongodb.com/try/download/community) for Windows and run the installer. Choose **Complete** setup and install **MongoDB Compass** if prompted (optional GUI).

Start MongoDB as a Windows service (default during install), or from PowerShell:

```powershell
net start MongoDB
```

**4. Use a terminal**

Open **PowerShell**, **Command Prompt**, or [Windows Terminal](https://aka.ms/terminal). All commands below work the same; use `\` instead of `/` for paths if needed.

**Alternative — MongoDB Atlas:** skip local MongoDB and use a cloud connection string in `server/.env`.

---

### Clone the project

```bash
git clone git@github.com:suryaneniTech/advaitam.git
cd advaitam
```

If you use HTTPS:

```bash
git clone https://github.com/suryaneniTech/advaitam.git
cd advaitam
```

---

### Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env`:

1. **JWT_SECRET** — generate a random secret:
   ```bash
   openssl rand -base64 48
   ```
2. **ADMIN_EMAIL** / **ADMIN_PASSWORD** — your admin login
3. **MONGODB_URI** — default `mongodb://localhost:27017/advaitam` for local MongoDB, or your Atlas URI
4. **Gmail** (optional, for email invites) — see [Gmail setup](#gmail-setup-for-email-invites)

Ensure `PORT` in `server/.env` matches `VITE_API_PROXY` in `client/.env` (default port **3030**).

---

### Install dependencies and run

From the project root:

```bash
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3030 |

Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `server/.env`.

---

### Troubleshooting a new setup

| Problem | Fix |
|---------|-----|
| `node: command not found` | Reinstall Node; restart terminal; check PATH |
| `mongosh: command not found` | Install MongoDB shell or use Atlas instead |
| `MongoDB connection failed` | Start MongoDB (`brew services start …`, `sudo systemctl start mongod`, or Windows service) |
| Login returns **403** on macOS | Port 5000 is often AirPlay — use port **3030** (already the default) |
| `EADDRINUSE` on API port | Change `PORT` in `server/.env` and update `VITE_API_PROXY` in `client/.env` |
| Gmail invite fails | Use a Google **App Password**, not your normal Gmail password |

---

## Quick start

If Node, npm, and MongoDB are already installed:

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
