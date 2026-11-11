# Database Backup and Restore

The Admin Users page downloads a complete PostgreSQL custom-format archive (`.dump`). Store a copy somewhere separate from the computer running Curiosity.

## Restore on a new Windows PC

1. Install PostgreSQL 18 and this project. Keep the downloaded `.dump` file accessible.
2. Create the application role and an empty database. Open PowerShell and run:

   ```powershell
   psql -U postgres -h localhost -p 5432 -d postgres
   ```

   In the PostgreSQL prompt, run:

   ```sql
   CREATE ROLE curiosity_user LOGIN;
   \password curiosity_user
   CREATE DATABASE curiosity_db OWNER curiosity_user;
   \q
   ```

   Choose a password when prompted and keep it for the app configuration below.

3. Restore the archive. Replace the filename with the downloaded file's actual path:

   ```powershell
   $env:PGPASSWORD = 'the-password-you-chose'
   & 'C:\Program Files\PostgreSQL\18\bin\pg_restore.exe' `
     -h localhost -p 5432 -U curiosity_user -d curiosity_db `
     --clean --if-exists --no-owner --no-privileges `
     'C:\path\to\curiosity-database-backup.dump'
   Remove-Item Env:PGPASSWORD
   ```

4. Set the local connection in `.env.local` (URL-encode special characters in the password):

   ```env
   DB_MODE=local
   LOCAL_DATABASE_URL=postgresql://curiosity_user:URL_ENCODED_PASSWORD@localhost:5432/curiosity_db
   ```

5. Start Curiosity with `npm run dev` or `npm start`.

The archive contains the database schema and data, but PostgreSQL roles and passwords are server-level settings and are not part of a database dump. Create the application role separately as shown above.

## Hourly OneDrive backups on Windows

Run `backup-db-to-onedrive.bat` from the project folder to start continuous hourly backups. It takes the first backup immediately, then starts another backup one hour after each run begins. Close the command window or press `Ctrl+C` to stop it.

The script uses the database configured by `DATABASE_URL` or `DB_MODE` and the matching database URL in `.env.local` (or `.env`). It requires PostgreSQL's `pg_dump.exe` to be on `PATH` or installed under `C:\Program Files\PostgreSQL`. Completed custom-format `.dump` files are copied into `Curiosity-Database-Backups` under the signed-in user's OneDrive folder, which OneDrive syncs to the cloud. On each hourly run, dated backup files older than 30 days are deleted from that folder (and OneDrive syncs those deletions). Make sure OneDrive is signed in and has enough available storage.
