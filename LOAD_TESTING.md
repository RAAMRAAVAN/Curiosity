# Isolated load-testing environment

The test environment uses a separate PostgreSQL cluster on `127.0.0.1:55433`, a separate database named `curiosity_loadtest`, generated local credentials, and a separate Next.js build directory (`.next-test`). It does not copy data from the development, production, or Cloudflare-hosted database.

## Initial setup

From PowerShell in the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-test-environment.ps1
npm run test:db:seed
npm run test:build
```

The setup script requires PostgreSQL 18 tools at `C:\Program Files\PostgreSQL\18\bin`. It creates a local-only PostgreSQL cluster, a non-superuser application role, applies the Prisma schema, and stores generated credentials in the ignored `.env.test.local` file. The seed contains synthetic records only: 51 centers, 5,000 students (99 at two centers and 98 at each of the other 49), 51 teachers, 51 ground-level coordinators, and 100 managers.

## Start the isolated app

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-test-database.ps1
npm run test:start
```

The production build listens on `http://127.0.0.1:3100`. Do not expose this port through Cloudflare or another public tunnel.

On Windows, run `start-load-test.bat` from the project folder to start the isolated database and app, wait for the health check, and choose a target: local loopback or the approved Cloudflare test hostname. For Cloudflare, confirm that Access protects the hostname and its Service Auth policy accepts a service token. If the local token is not configured, the launcher offers to run `scripts/configure-test-access.ps1`, which securely prompts for the values and writes them only to ignored `.env.test.local`. The load scripts send the service-token headers and permit only the exact test hostname. The launcher offers 202-user read-only or read/write tests and asks for confirmation before generating load. The live app can remain running on its existing port, but load testing shares PC resources and may temporarily affect live responsiveness. If your Cloudflare Tunnel routes the approved hostname to port 3100, the test app is reachable through it while running; protect the hostname with Cloudflare Access.

For development-only work, use `npm run test:dev` instead of `test:start`; development mode is not representative for performance benchmarking.

## Run workloads

Set a cautious concurrency first and increase only while monitoring CPU, memory, PostgreSQL, and error rates:

```powershell
$env:LOAD_TEST_CONCURRENCY = '25'
$env:LOAD_TEST_DURATION_SECONDS = '60'
npm run test:load:readonly
```

The write workload performs synthetic attendance writes in the isolated database. Each worker uses a test identity and a distinct seeded student:

```powershell
$env:HEAVY_LOAD_USERS = '25'
npm run test:load:write
```

To attempt a 500-user test after smaller runs succeed, set `HEAVY_LOAD_USERS` or `LOAD_TEST_CONCURRENCY` to `500`. The write test updates only the seeded synthetic attendance records in `curiosity_loadtest`.

## Stop and reset

Stop the app with Ctrl+C, then stop the test database:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-test-database.ps1
```

Synthetic test records can be removed with `npm run test:db:cleanup-seed`. To regenerate the current synthetic data, run cleanup, then `npm run test:db:seed`. The schema and test database remain in place. Do not delete `.test-db` unless you intend to permanently remove this test cluster and its data.

## Isolation guard

All `test:*` database, server, and load-test commands pass through `scripts/with-test-env.js`. It refuses to run unless the configured connection is the exact local test role, database, and port. The test build also uses `.next-test` so it does not overwrite the normal `.next` production build.
