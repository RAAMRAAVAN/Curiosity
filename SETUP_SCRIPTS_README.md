# Local PostgreSQL Database Setup

This directory contains automated setup scripts to configure the local PostgreSQL database for Curiosity on any system.

## Prerequisites

- **PostgreSQL 18** installed at `C:\Program Files\PostgreSQL\18`
  - [Download PostgreSQL](https://www.postgresql.org/download/windows/)
  - During installation, remember the password for the `postgres` superuser

## Quick Start

Choose one of the methods below:

### Method 1: PowerShell (Recommended - More Reliable)

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-local-db.ps1
```

### Method 2: Batch File (.bat)

```cmd
setup-local-db.bat
```

Both scripts will:
1. ✅ Verify PostgreSQL is installed
2. ✅ Check PostgreSQL service is running
3. ✅ Create the `curiosity_user` account
4. ✅ Create the `curiosity_db` database
5. ✅ Restore database from backup (`local_before_neon_backup.dump`)
6. ✅ Test the connection

## What Gets Created

| Item | Value |
|------|-------|
| **Host** | 127.0.0.1 (localhost) |
| **Port** | 5432 |
| **User** | curiosity_user |
| **Password** | #Ram911! |
| **Database** | curiosity_db |

## After Setup

### Option A: Using Environment Variables (Temporary)

```powershell
$env:DB_MODE = 'local'
$env:LOCAL_DATABASE_URL = 'postgresql://curiosity_user:%23Ram911!@localhost:5432/curiosity_db'
npm run dev
```

### Option B: Using .env.local (Recommended - Persistent)

Create or edit `.env.local` in the project root:

```env
DB_MODE=local
LOCAL_DATABASE_URL=postgresql://curiosity_user:%23Ram911!@localhost:5432/curiosity_db
NEON_DATABASE_URL=postgresql://neondb_owner:npg_x0NJKRZC6GOi@ep-misty-block-aod3sxja.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Then run:

```cmd
npm run dev
```

## Troubleshooting

### Error: "PostgreSQL 18 not found"
- Verify PostgreSQL is installed at `C:\Program Files\PostgreSQL\18`
- If installed elsewhere, edit the script and change the path

### Error: "Could not connect to PostgreSQL as postgres user"
- Make sure PostgreSQL is running: `net start postgresql-x64-18`
- Check if the `postgres` user password is correct
- Try connecting manually: `psql -h localhost -U postgres -d postgres`

### Error: "Backup file not found"
- The script will skip restore if `local_before_neon_backup.dump` is missing
- You can restore manually later using: `pg_restore -h localhost -U curiosity_user -d curiosity_db -p 5432 local_before_neon_backup.dump`

### Connection still fails
- Test manually: `psql -h localhost -U curiosity_user -d curiosity_db`
- Set password first: `set PGPASSWORD=#Ram911!` (cmd) or `$env:PGPASSWORD="#Ram911!"` (PowerShell)

## Manual Setup (If Scripts Don't Work)

If the scripts fail, you can set up manually:

```powershell
# Set password environment variable
$env:PGPASSWORD = '#Ram911!'

# Connect to PostgreSQL
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -d postgres

# Inside psql:
CREATE USER curiosity_user WITH PASSWORD '#Ram911!';
CREATE DATABASE curiosity_db OWNER curiosity_user;
\q

# Restore database
& 'C:\Program Files\PostgreSQL\18\bin\pg_restore.exe' -h localhost -U curiosity_user -d curiosity_db -p 5432 local_before_neon_backup.dump

# Test connection
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U curiosity_user -d curiosity_db -c "SELECT 1;"
```

## Files in This Setup

- `setup-local-db.bat` - Batch file version (simpler, but less reliable)
- `setup-local-db.ps1` - PowerShell version (recommended)
- `local_before_neon_backup.dump` - Database backup to restore
- `DB_SETUP_GUIDE.md` - Detailed setup documentation
- `LOCAL_DB_SETUP.md` - Alternative setup guide

## Support

For issues, check:
1. [PostgreSQL Documentation](https://www.postgresql.org/docs/18/)
2. `DB_SETUP_GUIDE.md` in the project root
3. `LOCAL_DB_SETUP.md` in the project root
