const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.$queryRaw`SELECT to_regclass('public.assessment_reattempt_requests')::text AS table_name`;
  console.log(JSON.stringify(rows));
  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
