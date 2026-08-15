# Local PostgreSQL setup for Curiosity

## Use this when the local app database/user is missing

### 1) Create user and database

Run in PowerShell from the project root:

```powershell
$env:PGPASSWORD = '#Ram911!'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -p 5432 -d postgres -c "CREATE USER curiosity_user WITH PASSWORD '#Ram911!';"
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -p 5432 -d postgres -c "CREATE DATABASE curiosity_db OWNER curiosity_user;"
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -U postgres -p 5432 -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE curiosity_db TO curiosity_user;"
```

### 2) Sync Prisma schema and ensure the default admin user exists

```powershell
$env:DATABASE_URL='postgresql://curiosity_user:%23Ram911!@localhost:5432/curiosity_db'
npx prisma db push
node .\scripts\ensure-default-user.js
```

This creates the tables first, then creates or repairs the default admin login automatically if missing:

- email: `ram.ray@curiosity.com`
- password: `#Ram911!`
- role: `ADMIN`

### 3) Set local app environment

Use this in `.env` or `.env.local`:

```env
DB_MODE=local
LOCAL_DATABASE_URL=postgresql://curiosity_user:%23Ram911!@localhost:5432/curiosity_db
NEON_DATABASE_URL=postgresql://neondb_owner:npg_x0NJKRZC6GOi@ep-misty-block-aod3sxja.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### 4) Run the app

```powershell
$env:DB_MODE='local'
$env:DATABASE_URL=''
$env:LOCAL_DATABASE_URL='postgresql://curiosity_user:%23Ram911!@localhost:5432/curiosity_db'
npm.cmd run dev
```

## Alternative: run the script directly

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local-db.ps1
```

## Notes

- PostgreSQL server is running on port `5432`
- The app was previously pointed to the wrong port (`55432`)
- The local database credentials are:
  - user: `curiosity_user`
  - password: `#Ram911!`
  - database: `curiosity_db`
