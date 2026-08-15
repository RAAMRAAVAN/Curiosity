# Database Switch Guide

## Quick Start

**Change only ONE parameter in ONE file to switch databases.**

### File to edit
[.env.local](.env.local)

### Switch options

#### Use Local PostgreSQL
```env
DB_MODE=local
```

#### Use Neon Cloud
```env
DB_MODE=neon
```

---

## How it works

1. The app reads `DB_MODE` from `.env.local`
2. It automatically resolves the correct connection string:
   - `DB_MODE=local` → `LOCAL_DATABASE_URL`
   - `DB_MODE=neon` → `NEON_DATABASE_URL`
3. Frontend health check blocks the UI if the database is unreachable
4. Default admin user (ram.ray@curiosity.com / #Ram911!) is created automatically

---

## Start the app

### Development mode (with hot reload)
```powershell
npm run dev
```

### Production mode
```powershell
npm run build
npm start
```

### Via launcher (Windows)
```powershell
.\start-curiosity.bat
```

---

## Local database setup (first time only)

Run once to initialize the local database:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local-db.ps1
```

This will:
- Create the `curiosity_user` and `curiosity_db`
- Sync the Prisma schema
- Create the default admin user

See [LOCAL_DB_SETUP.md](LOCAL_DB_SETUP.md) for manual steps.

---

## Verify the switch works

Test by changing `DB_MODE` in `.env.local` and running:

```powershell
$env:DB_MODE='local'; npm run dev
```

or

```powershell
$env:DB_MODE='neon'; npm run dev
```

The app will use the respective database automatically.

---

## Credentials

### Local Database
- Host: `localhost:5432`
- User: `curiosity_user`
- Password: `#Ram911!`
- Database: `curiosity_db`

### Default Admin
- Email: `ram.ray@curiosity.com`
- Password: `#Ram911!`
- Role: `ADMIN`

### Neon Database
- Check your `.env.local` for `NEON_DATABASE_URL`
