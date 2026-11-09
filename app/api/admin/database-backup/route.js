import { spawn } from 'node:child_process';
import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { applyDatabaseConfig } from '@/lib/db-config';
import { requireAdminPermission } from '@/lib/adminRbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolvePgDumpPath() {
  const configuredPath = process.env.PG_DUMP_PATH;
  if (configuredPath && existsSync(configuredPath)) return configuredPath;

  const configuredBin = process.env.PG_BIN;
  if (configuredBin) {
    const candidate = path.join(configuredBin, process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');
    if (existsSync(candidate)) return candidate;
  }

  if (process.platform === 'win32') {
    const installRoot = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PostgreSQL');
    if (existsSync(installRoot)) {
      const versions = readdirSync(installRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
      for (const version of versions) {
        const candidate = path.join(installRoot, version, 'bin', 'pg_dump.exe');
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  return process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
}

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'users.view');
  if (!auth.ok) return Response.json({ success: false, message: auth.message }, { status: auth.status });
  if (!auth.actor.isAdmin) {
    return Response.json({ success: false, message: 'Only Admin users can download a full database backup.' }, { status: 403 });
  }

  let databaseUrl;
  let url;
  try {
    databaseUrl = applyDatabaseConfig(process.env);
    url = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Unsupported database provider.');
  } catch (error) {
    console.error('Database backup configuration error:', error.message);
    return Response.json({ success: false, message: 'The database connection is not configured for backups.' }, { status: 500 });
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!databaseName || !url.hostname) {
    return Response.json({ success: false, message: 'The database connection is missing a host or database name.' }, { status: 500 });
  }

  const args = [
    '--no-password',
    '--host', url.hostname,
    '--port', url.port || '5432',
    '--username', decodeURIComponent(url.username),
    '--dbname', databaseName,
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--compress=6',
  ];
  const childEnv = { ...process.env };
  delete childEnv.DATABASE_URL;
  delete childEnv.LOCAL_DATABASE_URL;
  delete childEnv.NEON_DATABASE_URL;
  if (url.password) childEnv.PGPASSWORD = decodeURIComponent(url.password);
  if (url.searchParams.has('sslmode')) childEnv.PGSSLMODE = url.searchParams.get('sslmode');
  if (url.searchParams.has('sslrootcert')) childEnv.PGSSLROOTCERT = url.searchParams.get('sslrootcert');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `curiosity-database-backup-${timestamp}.dump`;
  let tempDirectory;
  try {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'curiosity-db-backup-'));
    const dumpPath = path.join(tempDirectory, fileName);
    const result = await new Promise((resolve) => {
      const child = spawn(resolvePgDumpPath(), [...args, '--file', dumpPath], {
        env: childEnv,
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let errorOutput = '';
      const stopBackup = () => child.kill();
      req.signal.addEventListener('abort', stopBackup, { once: true });
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => {
        errorOutput = `${errorOutput}${chunk}`.slice(-4000);
      });
      child.on('error', (error) => {
        req.signal.removeEventListener('abort', stopBackup);
        resolve({ code: null, error, errorOutput });
      });
      child.on('close', (code) => {
        req.signal.removeEventListener('abort', stopBackup);
        resolve({ code, errorOutput });
      });
    });

    if (result.code !== 0) {
      console.error('Database backup process failed:', result.errorOutput || result.error?.message || `pg_dump exited with code ${result.code}`);
      await rm(tempDirectory, { recursive: true, force: true });
      return Response.json({
        success: false,
        message: 'Database backup failed. Check that PostgreSQL client tools are installed and the database is reachable.',
      }, { status: 500 });
    }

    const backupStream = createReadStream(dumpPath);
    const cleanup = () => { void rm(tempDirectory, { recursive: true, force: true }); };
    backupStream.once('close', cleanup);
    backupStream.once('error', cleanup);

    return new Response(Readable.toWeb(backupStream), {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    });
  } catch (error) {
    if (tempDirectory) await rm(tempDirectory, { recursive: true, force: true });
    console.error('Database backup failed:', error.message);
    return Response.json({
      success: false,
      message: 'Unable to create the database backup. Check the server backup configuration.',
    }, { status: 500 });
  }
}
