const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
const prisma = new PrismaClient();
(async () => {
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS assessment_reattempt_requests (id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', reason TEXT, requested_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP(3), reviewed_by TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS assessment_reattempt_requests_assessment_id_idx ON assessment_reattempt_requests (assessment_id)`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS assessment_reattempt_requests_user_id_idx ON assessment_reattempt_requests (user_id)`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS assessment_reattempt_requests_status_idx ON assessment_reattempt_requests (status)`;
  await prisma.$executeRaw`ALTER TABLE assessment_reattempt_requests ADD CONSTRAINT assessment_reattempt_requests_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE ON UPDATE CASCADE`;
  await prisma.$executeRaw`ALTER TABLE assessment_reattempt_requests ADD CONSTRAINT assessment_reattempt_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE`;
  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
